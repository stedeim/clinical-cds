import { NextResponse } from "next/server";
import { z } from "zod";
import { getCase } from "@/lib/store";
import { parseTranscript } from "@/lib/note/transcript";
import { summarizeTranscript, SummaryContractError } from "@/lib/summary/engine";
import { recordAudit } from "@/lib/audit";
import { requireVerifiedClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { rateLimit, clientIp } from "@/lib/rate-limit";

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
  const rl = rateLimit(`summary:${clientIp(req)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let clinicianId: string;
  try {
    const userId = await currentUserIdFromCookies();
    clinicianId = (await requireVerifiedClinician(userId)).id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[summary] auth error", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
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
