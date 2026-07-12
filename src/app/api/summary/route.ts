import { NextResponse } from "next/server";
import { z } from "zod";
import { getCase } from "@/lib/store";
import { parseTranscript } from "@/lib/note/transcript";
import { summarizeTranscript, SummaryContractError } from "@/lib/summary/engine";
import { recordAudit } from "@/lib/audit";
import { requireEntitledClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { composedRateLimit } from "@/lib/rate-limit";
import { SAMPLE_ENCOUNTER_ID } from "@/lib/sample-case";

// Transcript-summary endpoint — the "cut the fluff" button. Same PHI posture
// as /api/note: the browser sends the encounter id + transcript text, the
// server parses segments, runs the provenance-gated summary engine, audits,
// and returns the validated summary. The transcript is transient here too —
// summarized, returned, never persisted as a blob.

export const runtime = "nodejs";

const Body = z.object({
  encounterId: z.string().min(1),
  transcriptText: z.string().min(20).max(20000),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Sample encounter (synthetic, fixed id): open pre-signup. Real cases keep
  // the clinician gate.
  const isSample = body.encounterId === SAMPLE_ENCOUNTER_ID;
  let clinicianId = "sample-visitor";
  if (!isSample) {
    try {
      const userId = await currentUserIdFromCookies();
      clinicianId = (await requireEntitledClinician(userId)).id;
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("[summary] auth error", err);
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }
  }

  const rl = await composedRateLimit(req, {
    userIdentifier: isSample ? undefined : clinicianId,
    userConfig: isSample ? undefined : { max: 60, windowMs: 60_000, label: "summary" },
    ipConfig: { max: 30, windowMs: 60_000, label: "summary" },
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const record = await getCase(body.encounterId, clinicianId);
  if (!record) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const segments = parseTranscript(body.transcriptText);
  if (segments.length === 0) {
    return NextResponse.json({ error: "No readable transcript lines." }, { status: 400 });
  }

  try {
    const summary = await summarizeTranscript(segments);
    if (isSample) return NextResponse.json({ summary, transcript: segments });
    await recordAudit({
      clinicianId,
      action: "summary_generate",
      encounterId: body.encounterId,
      detail: {
        model: summary.model,
        transcriptSegments: segments.length,
        points:
          summary.keyPoints.length + summary.pertinentNegatives.length + summary.patientConcerns.length,
      },
    });
    return NextResponse.json({ summary, transcript: segments });
  } catch (err) {
    // Audit failed post-auth invocations too — same rationale as /api/query.
    if (!isSample) {
      await recordAudit({
        clinicianId,
        action: "summary_generate",
        encounterId: body.encounterId,
        detail: {
          outcome: "error",
          errorType: err instanceof SummaryContractError ? "contract" : "internal",
          transcriptSegments: segments.length,
        },
      }).catch(() => {});
    }
    if (err instanceof SummaryContractError) {
      return NextResponse.json(
        { error: "The summary engine returned an unusable response. Please retry." },
        { status: 502 },
      );
    }
    console.error("[summary] unexpected error", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
