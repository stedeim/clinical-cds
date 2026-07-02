import { describe, it, expect } from "vitest";
import { surfaceCheatSheets } from "@/lib/cheatsheet/engine";
import { CHEAT_SHEETS } from "@/lib/cheatsheet/library";

// The auto-surfaced panel's honesty contract: cards appear only when a chart
// problem matches the curated library — by ICD-10 prefix first, label keyword
// as fallback — and never otherwise. Unknown problems surface nothing.

describe("surfaceCheatSheets", () => {
  it("matches by ICD-10 code prefix", () => {
    const sheets = surfaceCheatSheets([{ code: "I10", label: "Essential hypertension" }]);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].id).toBe("hypertension");
  });

  it("matches a sub-code by prefix (I13.10 → hypertension)", () => {
    const sheets = surfaceCheatSheets([{ code: "I13.10", label: "Hypertensive heart and CKD" }]);
    expect(sheets.map((s) => s.id)).toContain("hypertension");
  });

  it("falls back to label keywords when there is no code", () => {
    const sheets = surfaceCheatSheets([{ label: "Right knee pain, likely osteoarthritis" }]);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].id).toBe("knee-oa");
  });

  it("surfaces nothing for problems outside the library", () => {
    expect(surfaceCheatSheets([{ code: "S52.5", label: "Distal radius fracture" }])).toHaveLength(0);
    expect(surfaceCheatSheets([])).toHaveLength(0);
  });

  it("dedupes when two problems map to the same topic", () => {
    const sheets = surfaceCheatSheets([
      { code: "I10", label: "Essential hypertension" },
      { label: "high blood pressure, uncontrolled" },
    ]);
    expect(sheets).toHaveLength(1);
  });

  it("caps at two cards in chart order", () => {
    const sheets = surfaceCheatSheets([
      { code: "I10", label: "Hypertension" },
      { code: "E11.9", label: "Type 2 diabetes" },
      { code: "E78.5", label: "Hyperlipidemia" },
    ]);
    expect(sheets.map((s) => s.id)).toEqual(["hypertension", "diabetes-t2"]);
  });
});

describe("library integrity", () => {
  it("every entry is fully cited and matchable", () => {
    for (const sheet of CHEAT_SHEETS) {
      expect(sheet.sources.length, sheet.id).toBeGreaterThan(0);
      expect(sheet.bullets.length, sheet.id).toBeGreaterThan(0);
      expect(sheet.codePrefixes.length + sheet.keywords.length, sheet.id).toBeGreaterThan(0);
    }
  });

  it("topic ids are unique", () => {
    const ids = CHEAT_SHEETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
