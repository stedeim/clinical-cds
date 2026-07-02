import { describe, it, expect } from "vitest";
import { NoteSpan, NoteSection } from "@/lib/note/schema";

// The provenance moat, enforced structurally.

describe("NoteSpan provenance rules", () => {
  it("accepts a structured lift with a sourceRef and confidence 1.0", () => {
    const r = NoteSpan.safeParse({ text: "BP 128/78", provenance: "structured", sourceRef: "vital:BP", confidence: 1 });
    expect(r.success).toBe(true);
  });

  it("rejects a structured span with a null sourceRef", () => {
    const r = NoteSpan.safeParse({ text: "BP 128/78", provenance: "structured", sourceRef: null, confidence: 1 });
    expect(r.success).toBe(false);
  });

  it("rejects a structured span whose confidence is not 1.0", () => {
    const r = NoteSpan.safeParse({ text: "BP 128/78", provenance: "structured", sourceRef: "vital:BP", confidence: 0.9 });
    expect(r.success).toBe(false);
  });

  it("rejects a spoken span with a null sourceRef", () => {
    const r = NoteSpan.safeParse({ text: "I feel tired", provenance: "spoken", sourceRef: null, confidence: 1 });
    expect(r.success).toBe(false);
  });

  it("requires an inferred span to have sourceRef === null", () => {
    expect(NoteSpan.safeParse({ text: "likely viral", provenance: "inferred", sourceRef: null, confidence: 0.6 }).success).toBe(true);
    expect(NoteSpan.safeParse({ text: "likely viral", provenance: "inferred", sourceRef: "problem:0", confidence: 0.6 }).success).toBe(false);
  });
});

describe("NoteSection objective 'exam left blank' moat", () => {
  it("rejects a spoken span in the objective section", () => {
    const r = NoteSection.safeParse({
      heading: "objective",
      spans: [{ text: "patient said it hurts", provenance: "spoken", sourceRef: "seg-1", confidence: 1 }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts structured objective spans", () => {
    const r = NoteSection.safeParse({
      heading: "objective",
      spans: [{ text: "BP 128/78 mmHg", provenance: "structured", sourceRef: "vital:BP", confidence: 1 }],
    });
    expect(r.success).toBe(true);
  });

  it("allows spoken spans in the subjective section", () => {
    const r = NoteSection.safeParse({
      heading: "subjective",
      spans: [{ text: "Patient: I feel tired", provenance: "spoken", sourceRef: "seg-1", confidence: 1 }],
    });
    expect(r.success).toBe(true);
  });
});
