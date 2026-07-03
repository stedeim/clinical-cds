import { z } from "zod";
import type { Medication, Allergy } from "../types";
import { classesForAllergen, medicationInClass, ALLERGY_CLASSES } from "./rules";

// The allergy conflict engine.
//
// Pure and offline: compares each charted medication against each recorded
// allergy using the curated class table. Three finding kinds, in order of
// directness, every one stating its basis so the clinician can check the
// reasoning at a glance:
//   direct — the allergen name itself appears in the medication
//   class  — the med is a member of the allergen's drug class
//   cross  — the med belongs to a documented cross-reactive class (caution)
// No match → no finding. Allergens/meds outside the table are honestly
// unchecked — the absence of a flag is never "checked and safe".

export const AllergyConflictKind = z.enum(["direct", "class", "cross"]);

export const AllergyFinding = z.object({
  medication: z.string().min(1),
  allergen: z.string().min(1), // the recorded allergy substance, verbatim
  kind: AllergyConflictKind,
  // The class-membership basis, always present — a conflict claim without a
  // stated basis is a contract violation.
  basis: z.string().min(1),
  message: z.string().min(1), // option-framed, never imperative
  // Where the allergy record came from: "this visit" or a prior visit date.
  allergySource: z.string().min(1),
});

export type AllergyConflictKindT = z.infer<typeof AllergyConflictKind>;
export type AllergyFindingT = z.infer<typeof AllergyFinding>;

export interface AllergyWithSource extends Allergy {
  source?: string; // e.g. "this visit", "visit of 2026-05-14"
}

export function checkAllergies(
  medications: Medication[],
  allergies: AllergyWithSource[],
): AllergyFindingT[] {
  const findings: AllergyFindingT[] = [];
  const seen = new Set<string>();

  for (const med of medications) {
    const medLower = med.name.toLowerCase();

    for (const allergy of allergies) {
      const substance = allergy.substance.trim();
      if (!substance) continue;
      const source = allergy.source ?? "this visit";
      const key = `${medLower}|${substance.toLowerCase()}`;
      if (seen.has(key)) continue;

      const finding = buildFinding(med.name, medLower, substance, source);
      if (finding) {
        findings.push(finding);
        seen.add(key);
      }
    }
  }

  // Self-guard, same as every other engine.
  for (const f of findings) {
    const parsed = AllergyFinding.safeParse(f);
    if (!parsed.success) throw new AllergyCheckError(parsed.error.message);
  }
  return findings;
}

function buildFinding(
  medName: string,
  medLower: string,
  substance: string,
  source: string,
): AllergyFindingT | null {
  const reaction = ` Recorded allergy: ${substance} (${source}).`;

  // 1. Direct: the allergen name itself appears in the medication name.
  const substanceLower = substance.toLowerCase();
  const directToken = substanceLower
    .split(/[\s,/]+/)
    .filter((t) => t.length >= 4) // skip "to", "and", reaction words
    .find((t) => medLower.includes(t));
  if (directToken) {
    return {
      medication: medName,
      allergen: substance,
      kind: "direct",
      basis: `"${directToken}" appears in both the recorded allergy and the medication name`,
      message: `${medName} matches the recorded allergy "${substance}" directly — consider confirming before prescribing.${reaction}`,
      allergySource: source,
    };
  }

  // 2/3. Class membership and documented cross-reactivity.
  for (const cls of classesForAllergen(substance)) {
    if (medicationInClass(medLower, cls)) {
      return {
        medication: medName,
        allergen: substance,
        kind: "class",
        basis: `${medName} is a member of ${cls.label}; the recorded allergy maps to that class`,
        message: `${medName} belongs to ${cls.label}, which matches the recorded allergy "${substance}" — consider an alternative or confirming tolerance.${reaction}`,
        allergySource: source,
      };
    }
    for (const cross of cls.crossReactiveWith ?? []) {
      const crossClass = ALLERGY_CLASSES.find((c) => c.id === cross.classId);
      if (crossClass && medicationInClass(medLower, crossClass)) {
        return {
          medication: medName,
          allergen: substance,
          kind: "cross",
          basis: cross.note,
          message: `${medName} (${crossClass.label}) is cross-reactive with the recorded allergy "${substance}" (${cls.label}) — ${cross.note}${reaction}`,
          allergySource: source,
        };
      }
    }
  }

  return null;
}

export class AllergyCheckError extends Error {
  constructor(detail: string) {
    super(`Allergy check produced an invalid finding: ${detail}`);
    this.name = "AllergyCheckError";
  }
}
