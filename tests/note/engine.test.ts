import { describe, it, expect } from "vitest";
import { mockNote } from "@/lib/note/engine";
import { GeneratedNote, type TranscriptSegment } from "@/lib/note/schema";
import { makeCase } from "../fixtures";

// The deterministic note path — always valid, always honest, no API key needed.
// (The model path falls back to exactly this on any failure, so covering the mock
// covers the safety net.)

function sectionsByHeading(note: ReturnType<typeof mockNote>) {
  return Object.fromEntries(note.sections.map((s) => [s.heading, s]));
}

describe("mockNote (chart-only)", () => {
  const note = mockNote(makeCase());

  it("satisfies the GeneratedNote contract", () => {
    expect(GeneratedNote.safeParse(note).success).toBe(true);
  });

  it("is stamped as the mock with no transcript grounding", () => {
    expect(note.model).toBe("mock");
    expect(note.transcriptId).toBeNull();
  });

  it("emits all four SOAP sections", () => {
    expect(note.sections.map((s) => s.heading)).toEqual(["subjective", "objective", "assessment", "plan"]);
  });

  it("uses only structured spans when there is no transcript (nothing spoken)", () => {
    const spoken = note.sections.flatMap((s) => s.spans).filter((sp) => sp.provenance === "spoken");
    expect(spoken).toHaveLength(0);
    const structured = note.sections.flatMap((s) => s.spans).filter((sp) => sp.provenance === "structured");
    expect(structured.length).toBeGreaterThan(0);
  });

  it("lifts the medication into the plan section", () => {
    const plan = sectionsByHeading(note).plan;
    expect(plan.spans.some((sp) => sp.text.includes("Lisinopril"))).toBe(true);
  });
});

describe("mockNote (transcript-grounded)", () => {
  const transcript: TranscriptSegment[] = [
    { id: "seg-1", speaker: "patient", text: "I've felt tired lately." },
    { id: "seg-2", speaker: "clinician", text: "Any dizziness?" },
  ];
  const note = mockNote(makeCase(), transcript);

  it("marks the note as transcript-grounded", () => {
    expect(note.transcriptId).toBe("pasted");
    expect(GeneratedNote.safeParse(note).success).toBe(true);
  });

  it("emits verbatim spoken spans grounded in their segment ids, confidence 1.0", () => {
    const subjective = sectionsByHeading(note).subjective;
    const spoken = subjective.spans.filter((sp) => sp.provenance === "spoken");
    expect(spoken).toHaveLength(2);
    expect(spoken[0]).toMatchObject({ text: "Patient: I've felt tired lately.", sourceRef: "seg-1", confidence: 1 });
    expect(spoken[1]).toMatchObject({ text: "Clinician: Any dizziness?", sourceRef: "seg-2", confidence: 1 });
  });

  it("keeps the objective (exam) section free of spoken spans", () => {
    const objective = sectionsByHeading(note).objective;
    expect(objective.spans.every((sp) => sp.provenance !== "spoken")).toBe(true);
  });
});
