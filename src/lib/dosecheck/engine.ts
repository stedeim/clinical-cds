import type { Medication } from "../types";
import { DoseFinding, type DoseFinding as DoseFindingT, type DoseCheckResult } from "./schema";
import { matchDoseRule } from "./rules";

// The dose-check engine.
//
// Pure and offline-first: it compares each medication's total daily dose against
// a curated reference ceiling (see rules.ts) and returns a cited *consideration*
// when a dose is above that ceiling. It never emits a directive, never guesses a
// ceiling it doesn't have, and stays silent when the dose is fine or the drug is
// unknown — silence beats a false alarm.
//
// No PHI beyond the drug string + dose ever leaves the process; RxNorm (when
// enabled) receives only the medication name, consistent with the "PHI never
// round-trips" posture of the Q&A path.

const MG_PER_UNIT: Record<string, number> = {
  mg: 1,
  milligram: 1,
  milligrams: 1,
  g: 1000,
  gram: 1000,
  grams: 1000,
  mcg: 0.001,
  microgram: 0.001,
  micrograms: 0.001,
  ug: 0.001,
  µg: 0.001,
};

// Parse a free-text dose ("10 mg", "200mg", "0.5 g", "50 mcg") to milligrams.
// A bare number with no unit is assumed to be mg (the overwhelmingly common
// case in an outpatient med list). Returns null if no dose can be read.
export function parseDoseToMg(dose: string | undefined): number | null {
  if (!dose) return null;
  const m = dose.toLowerCase().match(/([0-9]+(?:\.[0-9]+)?)\s*(µg|mcg|ug|mg|g|micrograms?|milligrams?|grams?)?/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value)) return null;
  const unit = m[2];
  const factor = unit ? MG_PER_UNIT[unit] : 1; // no unit -> assume mg
  if (factor === undefined) return null;
  return value * factor;
}

// Convert a frequency string to administrations per day. Unknown/blank
// frequency conservatively assumes once daily (1), which cannot manufacture a
// false "exceeds" flag from a well-under-ceiling single dose.
export function parseFrequencyPerDay(frequency: string | undefined): number {
  if (!frequency) return 1;
  const f = frequency.toLowerCase().trim();

  // Explicit qNh interval, e.g. "q8h", "q 12 h", "every 6 hours"
  const interval = f.match(/q\s*([0-9]+)\s*h/) || f.match(/every\s+([0-9]+)\s*(?:hours?|h)/);
  if (interval) {
    const hrs = parseInt(interval[1], 10);
    if (hrs > 0) return 24 / hrs;
  }

  if (/\bqid\b|four times/.test(f)) return 4;
  if (/\btid\b|three times/.test(f)) return 3;
  if (/\bbid\b|twice/.test(f)) return 2;
  if (/\bqhs\b|\bqd\b|\bod\b|once|daily|every day|nightly|at bedtime/.test(f)) return 1;
  if (/\bqod\b|every other day|alternate/.test(f)) return 0.5;
  if (/weekly|per week|\bqwk\b/.test(f)) return 1 / 7;

  return 1; // conservative default
}

export interface CheckDosesOptions {
  // When true AND a network is reachable, augment local resolution with a live
  // RxNorm lookup to fill `rxcui`/`ingredient`. Off by default so the engine is
  // deterministic and fully testable offline.
  useRxNorm?: boolean;
}

export async function checkDoses(
  meds: Medication[],
  opts: CheckDosesOptions = {},
): Promise<DoseCheckResult> {
  const findings: DoseFindingT[] = meds.map((med) => buildFinding(med));

  // Optional enrichment: fill rxcui/ingredient from a live RxNorm lookup. This
  // is additive only — it never changes status, message, or citation, so the
  // flag logic stays deterministic and offline-truthful. Only the drug NAME is
  // sent (no dose, no PHI), and any failure leaves the offline finding intact.
  if (opts.useRxNorm) {
    await Promise.all(
      findings.map(async (f) => {
        try {
          const res = await resolveRxNorm(f.medication);
          if (res) {
            f.rxcui = res.rxcui ?? f.rxcui;
            // Only borrow RxNorm's ingredient when we don't already have a
            // canonical one from the rules table — the curated name wins.
            f.ingredient = f.ingredient ?? res.ingredient ?? null;
          }
        } catch {
          // Network/parse failure → keep the offline finding as-is.
        }
      }),
    );
  }

  // Self-guard: our own output must satisfy the contract (e.g. a flag without a
  // citation is a bug, not something to render). Throw rather than emit.
  for (const f of findings) {
    const parsed = DoseFinding.safeParse(f);
    if (!parsed.success) {
      throw new DoseCheckError(`built an invalid finding for "${f.medication}": ${parsed.error.message}`);
    }
  }
  return findings;
}

// Resolve a free-text medication name to an RxNorm concept id and its base
// ingredient, using the public RxNav REST API. Returns null if nothing matches.
//
// Two hops, both name-only (no dose ever leaves the process):
//  1. /rxcui — normalize the name to an RxCUI (search=2 = approximate/normalized)
//  2. /related?tty=IN — resolve that RxCUI to its ingredient concept
async function resolveRxNorm(
  medicationName: string,
): Promise<{ rxcui: string | null; ingredient: string | null } | null> {
  const base = process.env.RXNORM_BASE_URL ?? "https://rxnav.nlm.nih.gov/REST";
  const name = medicationName.trim();
  if (!name) return null;

  const idRes = await fetch(`${base}/rxcui.json?name=${encodeURIComponent(name)}&search=2`);
  if (!idRes.ok) return null;
  const idJson = (await idRes.json()) as { idGroup?: { rxnormId?: string[] } };
  const rxcui = idJson.idGroup?.rxnormId?.[0] ?? null;
  if (!rxcui) return null;

  let ingredient: string | null = null;
  try {
    const relRes = await fetch(`${base}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=IN`);
    if (relRes.ok) {
      const relJson = (await relRes.json()) as {
        relatedGroup?: { conceptGroup?: { tty?: string; conceptProperties?: { name?: string }[] }[] };
      };
      const inGroup = relJson.relatedGroup?.conceptGroup?.find((g) => g.tty === "IN");
      ingredient = inGroup?.conceptProperties?.[0]?.name?.toLowerCase() ?? null;
    }
  } catch {
    // Ingredient hop is best-effort; the rxcui alone is still useful.
  }

  return { rxcui, ingredient };
}

function buildFinding(med: Medication): DoseFindingT {
  const name = med.name;
  const rule = matchDoseRule(name);

  // Drug not in the reference table -> honest "unknown", never a guess.
  if (!rule) {
    return {
      medication: name,
      rxcui: null,
      ingredient: null,
      parsedDoseMg: null,
      ceilingMg: null,
      status: "unknown",
      message: `No reference maximum on file for "${name}" — dose not checked.`,
      citation: null,
    };
  }

  const singleMg = parseDoseToMg(med.dose);
  if (singleMg === null) {
    return {
      medication: name,
      rxcui: null,
      ingredient: rule.ingredient,
      parsedDoseMg: null,
      ceilingMg: rule.maxDailyMg,
      status: "unparseable",
      message: med.dose
        ? `Couldn't read a dose from "${med.dose}" — dose not checked.`
        : `No dose recorded for ${rule.ingredient} — dose not checked.`,
      citation: null,
    };
  }

  const perDay = parseFrequencyPerDay(med.frequency);
  const dailyMg = round(singleMg * perDay);
  const ceiling = rule.maxDailyMg;
  const dailyLabel = formatMg(dailyMg);
  const ceilingLabel = formatMg(ceiling);

  if (dailyMg > ceiling) {
    return {
      medication: name,
      rxcui: null,
      ingredient: rule.ingredient,
      parsedDoseMg: dailyMg,
      ceilingMg: ceiling,
      status: "exceeds",
      message:
        `${cap(rule.ingredient)} ~${dailyLabel}/day is above the reference maximum of ` +
        `${ceilingLabel}/day — consider confirming the intended dose.` +
        (rule.note ? ` (${rule.note})` : ""),
      citation: rule.citation, // required by schema for a flag; supplied here
    };
  }

  return {
    medication: name,
    rxcui: null,
    ingredient: rule.ingredient,
    parsedDoseMg: dailyMg,
    ceilingMg: ceiling,
    status: "ok",
    message: `${cap(rule.ingredient)} ~${dailyLabel}/day is within the reference maximum of ${ceilingLabel}/day.`,
    citation: null,
  };
}

function round(n: number): number {
  // Keep sub-mg precision for drugs like levothyroxine, whole-number otherwise.
  return n < 1 ? Math.round(n * 1000) / 1000 : Math.round(n * 100) / 100;
}

function formatMg(mg: number): string {
  if (mg < 1) return `${Math.round(mg * 1000)} mcg`;
  return `${mg} mg`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export class DoseCheckError extends Error {
  constructor(detail: string) {
    super(`Dose check produced an invalid finding: ${detail}`);
    this.name = "DoseCheckError";
  }
}
