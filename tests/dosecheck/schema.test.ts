import { describe, it, expect } from "vitest";
import { DoseFinding } from "@/lib/dosecheck/schema";

// The contract that prevents an uncited red banner from ever reaching the UI.

const base = {
  medication: "Amlodipine",
  rxcui: null,
  ingredient: "amlodipine",
  parsedDoseMg: 20,
  ceilingMg: 10,
  message: "Amlodipine ~20 mg/day is above the reference maximum.",
};

describe("DoseFinding schema", () => {
  it("rejects a flagging status (exceeds) with no citation", () => {
    const r = DoseFinding.safeParse({ ...base, status: "exceeds", citation: null });
    expect(r.success).toBe(false);
  });

  it("rejects a below_threshold flag with no citation", () => {
    const r = DoseFinding.safeParse({ ...base, status: "below_threshold", citation: null });
    expect(r.success).toBe(false);
  });

  it("accepts a flagging status when a citation is present", () => {
    const r = DoseFinding.safeParse({
      ...base,
      status: "exceeds",
      citation: { title: "Amlodipine — max daily dose", source: "FDA label (DailyMed)" },
    });
    expect(r.success).toBe(true);
  });

  it("accepts ok / unknown with no citation (silence, not a flag)", () => {
    expect(DoseFinding.safeParse({ ...base, status: "ok", citation: null }).success).toBe(true);
    expect(
      DoseFinding.safeParse({
        medication: "Ibuprofen",
        rxcui: null,
        ingredient: null,
        parsedDoseMg: null,
        ceilingMg: null,
        status: "unknown",
        message: "No reference maximum on file.",
        citation: null,
      }).success,
    ).toBe(true);
  });

  it("defaults citation to null when omitted", () => {
    const r = DoseFinding.safeParse({ ...base, status: "ok" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.citation).toBeNull();
  });
});
