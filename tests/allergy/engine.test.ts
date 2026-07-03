import { describe, it, expect } from "vitest";
import { checkAllergies } from "@/lib/allergy/engine";
import { ALLERGY_CLASSES } from "@/lib/allergy/rules";

// The allergy conflict engine: deterministic class-membership facts, three
// finding kinds in order of directness, silence outside the table. Every
// finding must state its basis and where the allergy record came from.

describe("checkAllergies", () => {
  it("flags a direct name match", () => {
    const out = checkAllergies(
      [{ name: "Amoxicillin", dose: "500 mg" }],
      [{ substance: "amoxicillin — hives", source: "this visit" }],
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("direct");
    expect(out[0].allergySource).toBe("this visit");
  });

  it("flags a class conflict: penicillin allergy vs amoxicillin", () => {
    const out = checkAllergies(
      [{ name: "Amoxicillin", dose: "500 mg" }],
      [{ substance: "Penicillin" }],
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("class");
    expect(out[0].basis).toContain("penicillin-class");
  });

  it("flags documented cross-reactivity as a caution: penicillin allergy vs cephalexin", () => {
    const out = checkAllergies([{ name: "Cephalexin" }], [{ substance: "penicillin" }]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("cross");
    expect(out[0].message).toContain("cross-reactive");
  });

  it("flags sulfa allergy vs Bactrim, and NSAID allergy vs ibuprofen", () => {
    expect(checkAllergies([{ name: "Bactrim DS" }], [{ substance: "sulfa drugs" }])[0]?.kind).toBe("class");
    expect(checkAllergies([{ name: "Ibuprofen" }], [{ substance: "aspirin — anaphylaxis" }])[0]?.kind).toBe("class");
  });

  it("carries the historical source through to the finding", () => {
    const out = checkAllergies(
      [{ name: "Lisinopril", dose: "10 mg" }],
      [{ substance: "lisinopril angioedema", source: "visit of 2026-05-14" }],
    );
    expect(out).toHaveLength(1);
    expect(out[0].allergySource).toBe("visit of 2026-05-14");
    expect(out[0].message).toContain("visit of 2026-05-14");
  });

  it("stays silent when there is no relationship", () => {
    expect(checkAllergies([{ name: "Metformin" }], [{ substance: "penicillin" }])).toHaveLength(0);
    expect(checkAllergies([{ name: "Amoxicillin" }], [])).toHaveLength(0);
    expect(checkAllergies([], [{ substance: "penicillin" }])).toHaveLength(0);
  });

  it("does not false-positive on short/utility tokens", () => {
    // "no known drug allergies" style text must not match anything.
    expect(checkAllergies([{ name: "Atorvastatin" }], [{ substance: "no known drug allergies" }])).toHaveLength(0);
  });

  it("dedupes the same med/allergen pair", () => {
    const out = checkAllergies(
      [{ name: "Amoxicillin" }],
      [{ substance: "penicillin", source: "this visit" }, { substance: "penicillin", source: "this visit" }],
    );
    expect(out).toHaveLength(1);
  });
});

describe("rules table integrity", () => {
  it("cross-reactivity references resolve to real classes", () => {
    const ids = new Set(ALLERGY_CLASSES.map((c) => c.id));
    for (const cls of ALLERGY_CLASSES) {
      for (const cross of cls.crossReactiveWith ?? []) {
        expect(ids.has(cross.classId), `${cls.id} → ${cross.classId}`).toBe(true);
      }
    }
  });

  it("class ids are unique and every class is matchable", () => {
    const ids = ALLERGY_CLASSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of ALLERGY_CLASSES) {
      expect(c.allergenKeywords.length, c.id).toBeGreaterThan(0);
      expect(c.members.length, c.id).toBeGreaterThan(0);
    }
  });
});
