import { describe, it, expect } from "vitest";
import {
  parseConditionResponse,
  parseMedicationResponse,
  strengthToDose,
} from "@/lib/intake/clinical-tables";
import { CaseIntakeSchema } from "@/lib/case-intake";

// Parsers for the NIH Clinical Tables v3 response shape
// ([total, terms[], extraFields|null, display[][]]) — pinned against real
// payloads captured from the live API.

const ICD_PAYLOAD = [
  115,
  ["G93.2", "I10"],
  null,
  [
    ["G93.2", "Benign intracranial hypertension"],
    ["I10", "Essential (primary) hypertension"],
  ],
];

const RXTERMS_PAYLOAD = [
  3,
  ["Lisinopril (Oral Pill)", "Lisinopril (Oral Liquid)"],
  { STRENGTHS_AND_FORMS: [[" 2.5 mg Tab", "10 mg Tab"], ["1 mg/ml Sol"]] },
  [["Lisinopril (Oral Pill)"], ["Lisinopril (Oral Liquid)"]],
];

describe("parseConditionResponse", () => {
  it("maps [code, name] rows to suggestions", () => {
    const out = parseConditionResponse(ICD_PAYLOAD);
    expect(out).toEqual([
      { code: "G93.2", label: "Benign intracranial hypertension" },
      { code: "I10", label: "Essential (primary) hypertension" },
    ]);
  });

  it("returns empty on malformed payloads", () => {
    expect(parseConditionResponse(null)).toEqual([]);
    expect(parseConditionResponse([0, [], null, null])).toEqual([]);
    expect(parseConditionResponse("nope")).toEqual([]);
  });
});

describe("parseMedicationResponse", () => {
  it("pairs each drug with its strengths by index", () => {
    const out = parseMedicationResponse(RXTERMS_PAYLOAD);
    expect(out).toEqual([
      { name: "Lisinopril (Oral Pill)", strengths: [" 2.5 mg Tab", "10 mg Tab"] },
      { name: "Lisinopril (Oral Liquid)", strengths: ["1 mg/ml Sol"] },
    ]);
  });

  it("tolerates a missing extras object", () => {
    const out = parseMedicationResponse([1, ["Aspirin"], null, [["Aspirin"]]]);
    expect(out).toEqual([{ name: "Aspirin", strengths: [] }]);
  });
});

describe("strengthToDose", () => {
  it("strips the dose form, keeps the strength", () => {
    expect(strengthToDose("10 mg Tab")).toBe("10 mg");
    expect(strengthToDose(" 2.5 mg Tab")).toBe("2.5 mg");
    expect(strengthToDose("12.5-10 mg Tab")).toBe("12.5-10 mg");
    expect(strengthToDose("1 mg/ml Sol")).toBe("1 mg/ml");
  });

  it("dose-check can read a converted strength (end-to-end sanity)", async () => {
    const { parseDoseToMg } = await import("@/lib/dosecheck/engine");
    expect(parseDoseToMg(strengthToDose("10 mg Tab"))).toBe(10);
  });
});

describe("CaseIntakeSchema structured arms", () => {
  it("keeps ICD codes and doses from picker-built arrays", () => {
    const parsed = CaseIntakeSchema.parse({
      chiefComplaint: "HTN follow-up",
      problems: [{ label: "Essential (primary) hypertension", code: "I10" }],
      medications: [{ name: "Lisinopril (Oral Pill)", dose: "10 mg" }],
    });
    expect(parsed.problems[0]).toEqual({ label: "Essential (primary) hypertension", code: "I10" });
    expect(parsed.medications[0]).toEqual({ name: "Lisinopril (Oral Pill)", dose: "10 mg" });
  });
});
