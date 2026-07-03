import { describe, it, expect } from "vitest";
import { needsOcr, MAX_OCR_PAGES } from "@/lib/history/ocr";

// The OCR trigger decision: a real text layer never trips it; a scanned PDF
// (page markers and stray glyphs only) always does. The OCR engine itself is
// exercised live (it downloads a language model on first run — not a unit
// test's business).

describe("needsOcr", () => {
  it("does not trigger for a normal text-layer PDF", () => {
    const text = "Past medical history: hypertension since 2019. Penicillin allergy (hives). ".repeat(3);
    expect(needsOcr(text, 1)).toBe(false);
  });

  it("triggers for an empty or page-markers-only extraction", () => {
    expect(needsOcr("", 1)).toBe(true);
    expect(needsOcr("\n\n-- 1 of 3 --\n\n-- 2 of 3 --\n\n-- 3 of 3 --\n", 3)).toBe(true);
  });

  it("scales the threshold with page count", () => {
    const thinText = "Chest x-ray report attached for review."; // fine for 1 page…
    expect(needsOcr(thinText, 1)).toBe(false);
    // …but the same trickle across 10 pages means the layer is basically empty.
    expect(needsOcr(thinText, 10)).toBe(true);
  });

  it("exports a sane page cap", () => {
    expect(MAX_OCR_PAGES).toBeGreaterThan(0);
    expect(MAX_OCR_PAGES).toBeLessThanOrEqual(20);
  });
});
