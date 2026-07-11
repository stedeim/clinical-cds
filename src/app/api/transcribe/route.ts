import { NextResponse } from "next/server";
import { requireEntitledClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { isDeepgramConfigured, transcribeAudio } from "@/lib/transcribe/deepgram";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Dictation audio → Deepgram medical transcription → DR:/PT: lines.
// PHI posture: audio is relayed to the transcription provider and never
// written to disk or database — the transcript text goes back to the client,
// which decides what to ground into the note. Entitled clinicians only (the
// public sample keeps the browser speech engine; anonymous visitors never
// spend transcription credit).

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // ~20 minutes of opus

export async function POST(req: Request) {
  const rl = await rateLimit(`transcribe:${clientIp(req)}`, { max: 20, windowMs: 600_000, label: "transcribe" });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  if (!isDeepgramConfigured()) {
    return NextResponse.json({ error: "Transcription is not configured." }, { status: 501 });
  }

  try {
    await requireEntitledClinician(await currentUserIdFromCookies());
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }
  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "An audio file is required." }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Recording too long — keep dictation under ~20 minutes." }, { status: 413 });
  }

  try {
    const lines = await transcribeAudio(await file.arrayBuffer(), file.type || "audio/webm");
    if (lines.length === 0) {
      return NextResponse.json({ error: "No speech recognized in the recording." }, { status: 422 });
    }
    return NextResponse.json({ transcriptText: lines.join("\n") });
  } catch (err) {
    console.error("[transcribe]", err);
    return NextResponse.json(
      { error: "Transcription failed — the browser mic fallback still works." },
      { status: 502 },
    );
  }
}
