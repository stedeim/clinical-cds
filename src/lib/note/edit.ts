import type { GeneratedNote, NoteHeading, NoteSpan } from "./schema";

// In-place section editing. When the clinician edits a note section, the
// section's machine provenance is gone by definition — what remains is THEIR
// text under THEIR authority. Every line becomes a `clinician` span (no
// machine source, no confirm highlight), which is the honest description of
// an edited section, and any prior signature must be invalidated by the
// caller since the note content changed.

export function sectionToText(note: GeneratedNote, heading: NoteHeading): string {
  const spans = note.sections.find((s) => s.heading === heading)?.spans ?? [];
  return spans.map((s) => s.text).join("\n");
}

export function textToClinicianSpans(text: string): NoteSpan[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      text: line,
      provenance: "clinician" as const,
      sourceRef: null,
      confidence: 1,
    }));
}

export function withEditedSection(
  note: GeneratedNote,
  heading: NoteHeading,
  text: string,
): GeneratedNote {
  const spans = textToClinicianSpans(text);
  return {
    ...note,
    sections: note.sections.map((s) => (s.heading === heading ? { ...s, spans } : s)),
  };
}
