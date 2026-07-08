import { NextResponse } from "next/server";
import { z } from "zod";
import { getCase } from "@/lib/store";
import { generateNote, NoteContractError } from "@/lib/note/engine";
import { parseTranscript } from "@/lib/note/transcript";
import { recordAudit } from "@/lib/audit";
import { requireVerifiedClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { SAMPLE_ENCOUNTER_ID } from "@/lib/sample-case";

// Note-generation endpoint. Same PHI posture as /api/query: the browser sends an
// encounter id (+ an optional pasted transcript), never the case payload. This
// route assembles the case server-side, parses the transcript into segments,
// runs the provenance-guarded note engine, and returns the validated note.
//
// The transcript is transient — it is parsed, used to ground `spoken` spans, and
// returned to the caller, but never persisted as a case blob (consistent with
// the "never persisted as one blob" posture of the rest of the data layer).
//
// Access control mirrors the Q&A route: a verified clinician is required; stub
// mode (no Supabase env vars) lets a demo clinician through so the slice runs
// with zero keys.

export const runtime = "nodejs";

const Body = z.object({
  encounterId: z.string().min(1),
  // Optional: absent/empty → a chart-only note (no spoken spans).
  transcriptText: z.string().max(20000).optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`note:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
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

  // Sample encounter (synthetic, fixed id): open so visitors can try
  // transcript grounding pre-signup. Real cases keep the clinician gate.
  const isSample = body.encounterId === SAMPLE_ENCOUNTER_ID;
  let clinicianId = "sample-visitor";
  if (!isSample) {
    try {
      const userId = await currentUserIdFromCookies();
      const clinician = await requireVerifiedClinician(userId);
      clinicianId = clinician.id;
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("[note] auth error", err);
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }
  }

  const record = await getCase(body.encounterId, clinicianId);
  if (!record) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const transcript = body.transcriptText ? parseTranscript(body.transcriptText) : [];

  try {
    const note = await generateNote({
      caseContext: { patient: record.patient, encounter: record.encounter },
      transcript: transcript.length ? transcript : undefined,
    });

    if (!isSample) {
      await recordAudit({
        clinicianId,
        action: "note_generate",
        encounterId: body.encounterId,
        detail: { model: note.model, transcriptSegments: transcript.length },
      });
    }

    return NextResponse.json({ note, transcript });
  } catch (err) {
    if (err instanceof NoteContractError) {
      return NextResponse.json(
        { error: "The note engine returned an unusable response. Please retry." },
        { status: 502 },
      );
    }
    console.error("[note] unexpected error", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
