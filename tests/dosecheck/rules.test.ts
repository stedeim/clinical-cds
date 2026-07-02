import { describe, it, expect } from "vitest";
import { matchDoseRule, DOSE_RULES } from "@/lib/dosecheck/rules";

// The reference table + its whole-word matcher. The matcher is the front door to
// every dose finding: a false match invents a ceiling, a missed match silently
// skips the check. Both are moats, so both are tested.

describe("matchDoseRule", () => {
  it("matches by canonical ingredient name (case-insensitive)", () => {
    expect(matchDoseRule("lisinopril")?.ingredient).toBe("lisinopril");
    expect(matchDoseRule("LISINOPRIL")?.ingredient).toBe("lisinopril");
  });

  it("matches when the ingredient is one word among many", () => {
    expect(matchDoseRule("metoprolol succinate 50 mg")?.ingredient).toBe("metoprolol");
  });

  it("matches by brand alias", () => {
    expect(matchDoseRule("Zestril")?.ingredient).toBe("lisinopril");
    expect(matchDoseRule("norvasc")?.ingredient).toBe("amlodipine");
  });

  it("matches a multi-word brand only when all its tokens are present", () => {
    expect(matchDoseRule("Toprol XL")?.ingredient).toBe("metoprolol");
    // A lone token of a multi-word brand must NOT match on its own. "xl" is only
    // half of "toprol xl" and is not itself a brand, so it must not resolve.
    expect(matchDoseRule("xl")).toBeNull();
  });

  it("does NOT substring-match (whole-word only)", () => {
    // "co-amilozide" must not accidentally hit "amlodipine".
    expect(matchDoseRule("co-amilozide")).toBeNull();
    // "amlodipine" embedded in a larger token should not match.
    expect(matchDoseRule("xamlodipiney")).toBeNull();
  });

  it("returns null for a drug not in the table", () => {
    expect(matchDoseRule("ibuprofen")).toBeNull();
    expect(matchDoseRule("")).toBeNull();
  });

  it("every rule carries a citation with a title and source", () => {
    for (const rule of DOSE_RULES) {
      expect(rule.citation.title.length).toBeGreaterThan(0);
      expect(rule.citation.source.length).toBeGreaterThan(0);
      expect(rule.maxDailyMg).toBeGreaterThan(0);
    }
  });
});
