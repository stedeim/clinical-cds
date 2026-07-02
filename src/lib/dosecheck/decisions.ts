import type { Medication } from "../types";
import type { DoseFinding } from "./schema";
import { checkDoses } from "./engine";

// Clinician decisions on flagged dose findings.
//
// The engine never guesses the intended dose (a "Use 20 mg" button would be the
// app prescribing — outside Non-Device CDS). Instead the clinician decides:
//   • "kept"    — reviewed the caution and kept the dose as documented;
//   • "revised" — entered a corrected dose in their own words. The check re-runs
//     against it, and `refreshed` is that honest re-check result: the flag
//     clears only if the new dose is genuinely within the cited ceiling.
// Either way the original caution AND the decision survive into the exported
// note, so the record shows what was flagged and what the clinician chose.

export type DoseDecision =
  | { kind: "kept" }
  | { kind: "revised"; newDose: string; refreshed: DoseFinding };

// Re-run the dose check for one medication at a clinician-entered dose. Offline
// and deterministic (no RxNorm) — same contract as the original server check.
export async function reviseDose(med: Medication, newDose: string): Promise<DoseFinding> {
  const [finding] = await checkDoses([{ ...med, dose: newDose }]);
  return finding;
}

export function isFlagging(f: DoseFinding): boolean {
  return f.status === "exceeds" || f.status === "below_threshold";
}
