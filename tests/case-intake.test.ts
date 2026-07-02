import { describe, it, expect } from "vitest";
import { parseMedicationEntry, CaseIntakeSchema } from "@/lib/case-intake";

// Regression: intake used to store "Lisinopril 200 mg daily" whole as the
// medication NAME with no dose, so the dose-check engine (honestly) reported
// unparseable and never flagged — the exact case the flag exists for.

describe("parseMedicationEntry", () => {
  it("splits name / dose / frequency", () => {
    expect(parseMedicationEntry("Lisinopril 200 mg daily")).toEqual({
      name: "Lisinopril",
      dose: "200 mg",
      frequency: "daily",
    });
  });

  it("handles a dose with no frequency", () => {
    expect(parseMedicationEntry("Metformin 500mg")).toEqual({
      name: "Metformin",
      dose: "500mg",
      frequency: undefined,
    });
  });

  it("handles mcg doses and multi-word frequencies", () => {
    expect(parseMedicationEntry("Levothyroxine 75 mcg every morning")).toEqual({
      name: "Levothyroxine",
      dose: "75 mcg",
      frequency: "every morning",
    });
  });

  it("leaves an undoseable entry as name-only — never guesses", () => {
    expect(parseMedicationEntry("Multivitamin")).toEqual({ name: "Multivitamin" });
    expect(parseMedicationEntry("Insulin sliding scale")).toEqual({ name: "Insulin sliding scale" });
  });
});

describe("CaseIntakeSchema medications", () => {
  it("produces dose-checkable medications from the comma-separated form field", () => {
    const parsed = CaseIntakeSchema.parse({
      chiefComplaint: "HTN follow-up",
      medications: "Lisinopril 200 mg daily, Atorvastatin 40 mg nightly",
    });
    expect(parsed.medications).toEqual([
      { name: "Lisinopril", dose: "200 mg", frequency: "daily" },
      { name: "Atorvastatin", dose: "40 mg", frequency: "nightly" },
    ]);
  });
});
