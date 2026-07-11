import { describe, it, expect } from "vitest";
import { utterancesToLines } from "@/lib/transcribe/deepgram";

// Diarization gives voice clusters; identity comes from the text heuristic
// voting across each cluster. These tests pin the mapping.

describe("utterancesToLines", () => {
  it("labels a two-speaker visit by majority vote per voice", () => {
    const lines = utterancesToLines([
      { speaker: 0, transcript: "What brings you in today? Any chest pain?" },
      { speaker: 1, transcript: "I've been having headaches in the morning. My knee hurts too." },
      { speaker: 0, transcript: "Let's order a basic metabolic panel and recheck your potassium." },
      { speaker: 1, transcript: "I'm worried it's my blood pressure." },
    ]);
    expect(lines).toEqual([
      "DR: What brings you in today? Any chest pain?",
      "PT: I've been having headaches in the morning. My knee hurts too.",
      "DR: Let's order a basic metabolic panel and recheck your potassium.",
      "PT: I'm worried it's my blood pressure.",
    ]);
  });

  it("never labels both voices DR in a two-speaker conversation", () => {
    // Both clusters lean clinician-ish; the weaker one must yield to PT.
    const lines = utterancesToLines([
      { speaker: 0, transcript: "Any chest pain? Have you had fevers? Tell me about the cough." },
      { speaker: 1, transcript: "How long should I take it?" },
    ]);
    const labels = lines.map((l) => l.split(":")[0]);
    expect(new Set(labels).size).toBe(2);
    // The stronger interrogative cluster keeps DR.
    expect(lines[0].startsWith("DR:")).toBe(true);
  });

  it("keeps a single-voice recording consistent", () => {
    const lines = utterancesToLines([
      { speaker: 0, transcript: "Any shortness of breath?" },
      { speaker: 0, transcript: "Let's start a low dose and follow up in four weeks." },
    ]);
    expect(lines.every((l) => l.startsWith("DR:"))).toBe(true);
  });

  it("returns empty for no utterances", () => {
    expect(utterancesToLines([])).toEqual([]);
  });
});
