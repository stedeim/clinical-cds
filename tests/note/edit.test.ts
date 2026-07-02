import { describe, it, expect } from "vitest";
import { sectionToText, textToClinicianSpans, withEditedSection } from "@/lib/note/edit";
import { NoteSpan, GeneratedNote } from "@/lib/note/schema";
import { serializeNote, INFERRED_MARKER } from "@/lib/note/export";
import type { GeneratedNote as GeneratedNoteT } from "@/lib/note/schema";

// In-place editing: edited text becomes `clinician` spans — the doctor's
// words, no machine source, no confirm marker — and the result must still
// satisfy the note contract.

const NOTE: GeneratedNoteT = {
  encounterId: "demo-encounter-1",
  model: "mock",
  generatedAt: "2026-07-02T12:00:00.000Z",
  transcriptId: null,
  sections: [
    {
      heading: "subjective",
      spans: [
        { text: "Chief complaint: cough", provenance: "structured", sourceRef: "encounter:chiefComplaint", confidence: 1 },
        { text: "Likely viral etiology.", provenance: "inferred", sourceRef: null, confidence: 0.6 },
      ],
    },
    { heading: "objective", spans: [] },
    { heading: "assessment", spans: [] },
    { heading: "plan", spans: [] },
  ],
};

describe("sectionToText / textToClinicianSpans", () => {
  it("round-trips section text into clinician spans, one per line", () => {
    const text = sectionToText(NOTE, "subjective");
    expect(text).toBe("Chief complaint: cough\nLikely viral etiology.");

    const spans = textToClinicianSpans("Line one\n\n  Line two  \n");
    expect(spans).toEqual([
      { text: "Line one", provenance: "clinician", sourceRef: null, confidence: 1 },
      { text: "Line two", provenance: "clinician", sourceRef: null, confidence: 1 },
    ]);
  });
});

describe("withEditedSection", () => {
  it("replaces the section with clinician spans and stays schema-valid", () => {
    const edited = withEditedSection(NOTE, "subjective", "58F here for HTN follow-up.\nDenies chest pain.");
    const spans = edited.sections.find((s) => s.heading === "subjective")!.spans;
    expect(spans).toHaveLength(2);
    expect(spans.every((s) => s.provenance === "clinician" && s.sourceRef === null)).toBe(true);
    expect(GeneratedNote.safeParse(edited).success).toBe(true);
    // Other sections untouched.
    expect(edited.sections.find((s) => s.heading === "plan")!.spans).toHaveLength(0);
  });
});

describe("schema: clinician provenance", () => {
  it("is valid with a null sourceRef, including in the objective section", () => {
    const span = { text: "Lungs clear.", provenance: "clinician", sourceRef: null, confidence: 1 };
    expect(NoteSpan.safeParse(span).success).toBe(true);
  });

  it("rejects a clinician span claiming a machine source", () => {
    const span = { text: "x", provenance: "clinician", sourceRef: "med:0", confidence: 1 };
    expect(NoteSpan.safeParse(span).success).toBe(false);
  });
});

describe("export of edited sections", () => {
  it("renders clinician text plainly — no AI-confirm marker", () => {
    const edited = withEditedSection(NOTE, "subjective", "58F here for HTN follow-up.");
    const out = serializeNote(edited);
    expect(out).toContain("58F here for HTN follow-up.");
    expect(out).not.toContain(INFERRED_MARKER);
  });
});
