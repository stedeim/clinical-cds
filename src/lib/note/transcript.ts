import { TranscriptSegment, type TranscriptSegment as TranscriptSegmentT } from "./schema";

// Turn a pasted/typed visit transcript into structured segments.
//
// This is the honest stand-in for the ambient scribe: no ASR, no audio — the
// clinician (or a future capture pipeline) hands us TEXT, and we attribute each
// line to a speaker. The note engine then grounds `spoken` spans in these
// segments by id, so the provenance highlighting is real end to end.
//
// Accepted line shapes (speaker prefix is optional):
//   "DR: ...", "Doctor: ...", "Clinician - ...", "Provider> ..."  -> clinician
//   "PT: ...", "Patient: ..."                                      -> patient
//   any other prefixed or bare line                                -> other
//
// A line with no readable text is skipped. Segment ids are sequential ("seg-1",
// "seg-2", ...) and stable within a single parse, which is what sourceRef points
// at. Each segment is validated against the schema; anything that doesn't parse
// is dropped rather than emitted.

const CLINICIAN = /^(dr|drs|doc|doctor|md|do|clinician|provider|physician|np|pa)$/;
const PATIENT = /^(pt|patient|pat|client)$/;

export function parseTranscript(raw: string): TranscriptSegmentT[] {
  const segments: TranscriptSegmentT[] = [];
  let n = 0;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let speaker: TranscriptSegmentT["speaker"] = "other";
    let text = trimmed;

    // Optional "SPEAKER: text" / "SPEAKER - text" / "SPEAKER> text" prefix.
    const m = trimmed.match(/^([A-Za-z][A-Za-z. ]{0,19}?)\s*[:>\-]\s*(.+)$/);
    if (m) {
      const tag = m[1].toLowerCase().replace(/[.\s]/g, "");
      if (CLINICIAN.test(tag)) {
        speaker = "clinician";
        text = m[2].trim();
      } else if (PATIENT.test(tag)) {
        speaker = "patient";
        text = m[2].trim();
      }
      // An unrecognized prefix (e.g. a stray colon inside a sentence) is left as
      // part of the text with speaker "other" — we don't guess a role.
    }

    if (!text) continue;

    n += 1;
    const parsed = TranscriptSegment.safeParse({ id: `seg-${n}`, speaker, text });
    if (parsed.success) segments.push(parsed.data);
  }

  return segments;
}
