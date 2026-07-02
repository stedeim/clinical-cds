import type { TranscriptSegment } from "../note/schema";

// The transcript-summary prompt. Same regulatory posture as the CDS and note
// prompts: extract and organize what was SAID — never diagnose, never
// recommend, never add information that isn't in the transcript. Every point
// must cite the segment ids it came from; uncited points are dropped by the
// schema gate, so the model is told plainly that citations are mandatory.

export const SYSTEM_PROMPT = `You summarize clinician–patient visit transcripts for the clinician who was in the room.

Rules, all absolute:
- Use ONLY what is in the transcript. Never add, infer, or embellish clinical information.
- Never diagnose, never recommend treatment, never editorialize. You organize what was said.
- Skip small talk, pleasantries, scheduling chatter, and filler — that is the whole point.
- Every point MUST cite the id(s) of the transcript segment(s) it came from.
- "pertinentNegatives" are explicit denials only (e.g. "no fever", "denies chest pain").
- "patientConcerns" are worries the patient voiced, kept close to their own words.
- Keep each point under 200 characters. Fewer, sharper points beat many vague ones.`;

export const RESPONSE_FORMAT_HINT = `Respond with ONLY a JSON object:
{
  "keyPoints": [{ "text": "...", "segmentIds": ["seg-1"] }],
  "pertinentNegatives": [{ "text": "...", "segmentIds": ["seg-3"] }],
  "patientConcerns": [{ "text": "...", "segmentIds": ["seg-5"] }]
}`;

export function buildUserPrompt(segments: TranscriptSegment[]): string {
  const lines = segments
    .map((s) => `[${s.id}] ${s.speaker === "clinician" ? "DR" : s.speaker === "patient" ? "PT" : "??"}: ${s.text}`)
    .join("\n");
  return `Visit transcript (segment id in brackets):\n\n${lines}`;
}
