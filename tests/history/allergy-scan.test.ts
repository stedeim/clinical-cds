import { describe, it, expect } from "vitest";
import { scanDocumentsForAllergies } from "@/lib/history/allergy-scan";

// The document allergy scan proposes, never disposes: suggestions require an
// allergy signal word AND a known allergen in the same sentence, skip
// negations and already-recorded substances, and carry the source sentence.

const doc = (text: string) => [{ id: "d1", filename: "history.pdf", text }];

describe("scanDocumentsForAllergies", () => {
  it("finds an allergen with an allergy signal in the same sentence", () => {
    const out = scanDocumentsForAllergies(doc("Penicillin allergy with hives, 2015."), []);
    expect(out).toHaveLength(1);
    expect(out[0].substance).toBe("penicillin");
    expect(out[0].context).toContain("Penicillin allergy with hives");
    expect(out[0].documentName).toBe("history.pdf");
  });

  it("requires the allergy signal — a mere prescription mention is not an allergy", () => {
    expect(scanDocumentsForAllergies(doc("Prescribed penicillin 500 mg for strep throat."), [])).toHaveLength(0);
  });

  it("skips negated statements", () => {
    expect(scanDocumentsForAllergies(doc("No known drug allergies."), [])).toHaveLength(0);
    expect(scanDocumentsForAllergies(doc("Denies allergy to penicillin."), [])).toHaveLength(0);
  });

  it("skips substances already on the record", () => {
    const out = scanDocumentsForAllergies(doc("Penicillin allergy noted in 2015."), [
      { substance: "penicillin — hives" },
    ]);
    expect(out).toHaveLength(0);
  });

  it("dedupes across documents and sentences; anaphylaxis counts as a signal", () => {
    const out = scanDocumentsForAllergies(
      [
        { id: "d1", filename: "a.txt", text: "Sulfa allergy. Sulfa allergy repeated." },
        { id: "d2", filename: "b.txt", text: "Anaphylaxis after aspirin in 2019." },
      ],
      [],
    );
    expect(out.map((s) => s.substance).sort()).toEqual(["aspirin", "sulfa"]);
  });
});
