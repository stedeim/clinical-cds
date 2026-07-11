import { describe, it, expect } from "vitest";
import { CaseIntakeSchema } from "@/lib/case-intake";

// Client-side validation contract. The intake form runs CaseIntakeSchema
// against the assembled body before calling /api/cases/new, so the same
// rules the endpoint enforces must reject the form here first. These tests
// pin the behavior the form depends on — if the schema loosens or tightens,
// the form's UX assumptions need to move with it.

describe("CaseIntakeSchema — form gate", () => {
  it("rejects a missing chief complaint", () => {
    const parsed = CaseIntakeSchema.safeParse({ chiefComplaint: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === "chiefComplaint");
      expect(issue).toBeDefined();
    }
  });

  it("accepts the minimum viable encounter — chief complaint alone", () => {
    const parsed = CaseIntakeSchema.safeParse({ chiefComplaint: "sore throat" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // Sex defaults to unknown; framework defaults to US; arrays default to [].
      expect(parsed.data.sex).toBe("unknown");
      expect(parsed.data.framework).toBe("US");
      expect(parsed.data.problems).toEqual([]);
      expect(parsed.data.medications).toEqual([]);
      expect(parsed.data.allergies).toEqual([]);
    }
  });

  it("caps chief complaint at 500 chars — the endpoint stores it verbatim", () => {
    const long = "a".repeat(501);
    const parsed = CaseIntakeSchema.safeParse({ chiefComplaint: long });
    expect(parsed.success).toBe(false);
  });

  it("coerces a numeric age from the form string", () => {
    // The form sends `ageYears` as either a number (after Number() conversion)
    // or undefined. z.coerce.number handles the string→number path too, which
    // matters if the field is ever wired to send strings raw.
    const parsed = CaseIntakeSchema.safeParse({ chiefComplaint: "cough", ageYears: "42" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.ageYears).toBe(42);
  });

  it("rejects an out-of-range age — no negative years, no 300-year-olds", () => {
    expect(CaseIntakeSchema.safeParse({ chiefComplaint: "cough", ageYears: -1 }).success).toBe(false);
    expect(CaseIntakeSchema.safeParse({ chiefComplaint: "cough", ageYears: 200 }).success).toBe(false);
  });

  it("accepts structured medications from the picker with codes/doses intact", () => {
    const parsed = CaseIntakeSchema.safeParse({
      chiefComplaint: "HTN",
      medications: [{ name: "Lisinopril", dose: "10 mg", frequency: "daily" }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.medications).toEqual([
        { name: "Lisinopril", dose: "10 mg", frequency: "daily" },
      ]);
    }
  });

  it("rejects an unknown framework — the enum is the contract", () => {
    const parsed = CaseIntakeSchema.safeParse({
      chiefComplaint: "cough",
      framework: "MADEUP" as unknown as "US",
    });
    expect(parsed.success).toBe(false);
  });

  it("trims patientName to undefined when blank — keeps records pseudonymous", () => {
    const parsed = CaseIntakeSchema.safeParse({ chiefComplaint: "cough", patientName: "   " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.patientName).toBeUndefined();
  });
});
