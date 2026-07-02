import { describe, it, expect } from "vitest";
import { parseTranscript } from "@/lib/note/transcript";

describe("parseTranscript", () => {
  it("attributes clinician and patient prefixes", () => {
    const segs = parseTranscript("DR: How have you been?\nPT: Pretty good, thanks.");
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ id: "seg-1", speaker: "clinician", text: "How have you been?" });
    expect(segs[1]).toMatchObject({ id: "seg-2", speaker: "patient", text: "Pretty good, thanks." });
  });

  it("recognizes long-form and alternate role labels and separators", () => {
    const segs = parseTranscript("Doctor - Any chest pain?\nPatient> No.\nProvider: Good.");
    expect(segs.map((s) => s.speaker)).toEqual(["clinician", "patient", "clinician"]);
  });

  it("assigns sequential stable ids and skips blank lines", () => {
    const segs = parseTranscript("PT: one\n\n\nPT: two\n   \nPT: three");
    expect(segs.map((s) => s.id)).toEqual(["seg-1", "seg-2", "seg-3"]);
  });

  it("labels an unrecognized/absent prefix as 'other' and keeps the full text", () => {
    const segs = parseTranscript("Patient reports feeling tired today.");
    expect(segs).toHaveLength(1);
    expect(segs[0].speaker).toBe("other");
    expect(segs[0].text).toBe("Patient reports feeling tired today.");
  });

  it("returns an empty array for empty/whitespace input", () => {
    expect(parseTranscript("")).toEqual([]);
    expect(parseTranscript("\n   \n\t")).toEqual([]);
  });
});
