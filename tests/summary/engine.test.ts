import { describe, it, expect } from "vitest";
import { mockSummary } from "@/lib/summary/engine";
import { TranscriptSummary } from "@/lib/summary/schema";
import type { TranscriptSegment } from "@/lib/note/schema";

// The extractive mock is the zero-key "cut the fluff" engine. It never
// paraphrases (every point IS a transcript line) and never pads: greetings,
// scheduling chatter, and filler are dropped; every surviving point cites its
// segment id.

function seg(id: string, speaker: TranscriptSegment["speaker"], text: string): TranscriptSegment {
  return { id, speaker, text };
}

const VISIT: TranscriptSegment[] = [
  seg("seg-1", "clinician", "Good morning! How was the drive over?"),
  seg("seg-2", "patient", "Oh not bad, traffic on Main Street as usual."),
  seg("seg-3", "patient", "The cough started about five days ago, mostly at night."),
  seg("seg-4", "patient", "No fever that I've noticed, but I get winded on the stairs now."),
  seg("seg-5", "clinician", "Any chest pain or coughing up blood?"),
  seg("seg-6", "patient", "No blood. A little tightness, not really pain."),
  seg("seg-7", "patient", "I'm worried it could be something serious, my sister had pneumonia last year."),
  seg("seg-8", "clinician", "Let's get you scheduled with the front desk on your way out."),
];

describe("mockSummary", () => {
  it("drops fluff (greetings, traffic, scheduling) and keeps clinical signal", () => {
    const s = mockSummary(VISIT);
    const allText = [...s.keyPoints, ...s.pertinentNegatives, ...s.patientConcerns]
      .map((p) => p.text)
      .join(" | ");
    expect(allText).not.toContain("Good morning");
    expect(allText).not.toContain("traffic");
    expect(allText).not.toContain("front desk");
    expect(allText).toContain("cough started about five days ago");
  });

  it("categorizes explicit denials as pertinent negatives", () => {
    const s = mockSummary(VISIT);
    const negatives = s.pertinentNegatives.map((p) => p.text).join(" | ");
    expect(negatives).toContain("No fever");
    expect(negatives).toContain("No blood");
  });

  it("captures patient worries as concerns", () => {
    const s = mockSummary(VISIT);
    expect(s.patientConcerns).toHaveLength(1);
    expect(s.patientConcerns[0].text).toContain("worried");
  });

  it("grounds every point in a real segment id", () => {
    const s = mockSummary(VISIT);
    const validIds = new Set(VISIT.map((v) => v.id));
    for (const p of [...s.keyPoints, ...s.pertinentNegatives, ...s.patientConcerns]) {
      expect(p.segmentIds.length).toBeGreaterThan(0);
      for (const id of p.segmentIds) expect(validIds.has(id)).toBe(true);
    }
  });

  it("returns an honestly empty summary for pure fluff", () => {
    const s = mockSummary([
      seg("seg-1", "clinician", "Good morning!"),
      seg("seg-2", "patient", "Lovely weather today."),
    ]);
    expect(s.keyPoints).toHaveLength(0);
    expect(s.pertinentNegatives).toHaveLength(0);
    expect(s.patientConcerns).toHaveLength(0);
  });

  it("always satisfies the schema contract", () => {
    expect(TranscriptSummary.safeParse(mockSummary(VISIT)).success).toBe(true);
  });
});

describe("schema", () => {
  it("rejects an ungrounded point — a summary is never a black box", () => {
    const bad = {
      keyPoints: [{ text: "Cough for five days", segmentIds: [] }],
      pertinentNegatives: [],
      patientConcerns: [],
      model: "mock",
      generatedAt: new Date().toISOString(),
    };
    expect(TranscriptSummary.safeParse(bad).success).toBe(false);
  });
});
