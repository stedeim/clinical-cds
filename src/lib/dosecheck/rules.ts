import type { DoseCitation } from "./schema";

// Curated reference dose ceilings for the common outpatient / primary-care
// maintenance formulary.
//
// This is deliberately a small, auditable table rather than a live query: there
// is no free, complete, machine-queryable "max maintenance dose" endpoint, so we
// maintain the ceilings we're confident about and return `unknown` for anything
// not listed — never a guess. Each ceiling carries a citation; the UI shows it
// on any flag so a clinician can independently verify (the Non-Device CDS
// "independent review" requirement).
//
// maxDailyMg = the reference maximum TOTAL DAILY dose for the ingredient in its
// usual chronic indication. Where a salt/formulation splits the ceiling
// (e.g. metoprolol tartrate vs succinate), we take the more permissive value and
// say so in `note`, so the check errs toward NOT raising a false alarm.

export interface DoseRule {
  ingredient: string; // canonical, lowercase
  brands: string[]; // lowercase brand aliases that normalize to this ingredient
  maxDailyMg: number;
  citation: DoseCitation;
  note?: string;
}

// Helper to keep the citations uniform. We intentionally omit `url`: DailyMed
// links are per-setid and we won't fabricate one. Source names are honest.
function fda(title: string): DoseCitation {
  return { title, source: "FDA label (DailyMed)" };
}

export const DOSE_RULES: DoseRule[] = [
  // ACE inhibitors
  { ingredient: "lisinopril", brands: ["zestril", "prinivil"], maxDailyMg: 80, citation: fda("Lisinopril — maximum daily dose") },
  { ingredient: "enalapril", brands: ["vasotec"], maxDailyMg: 40, citation: fda("Enalapril — maximum daily dose") },
  { ingredient: "ramipril", brands: ["altace"], maxDailyMg: 20, citation: fda("Ramipril — maximum daily dose") },

  // ARBs
  { ingredient: "losartan", brands: ["cozaar"], maxDailyMg: 100, citation: fda("Losartan — maximum daily dose") },
  { ingredient: "valsartan", brands: ["diovan"], maxDailyMg: 320, citation: fda("Valsartan — maximum daily dose") },
  { ingredient: "olmesartan", brands: ["benicar"], maxDailyMg: 40, citation: fda("Olmesartan — maximum daily dose") },

  // Calcium channel blocker
  { ingredient: "amlodipine", brands: ["norvasc"], maxDailyMg: 10, citation: fda("Amlodipine — maximum daily dose") },

  // Thiazide
  { ingredient: "hydrochlorothiazide", brands: ["microzide", "hctz"], maxDailyMg: 50, citation: fda("Hydrochlorothiazide — maximum daily dose for hypertension") },

  // Beta blockers
  {
    ingredient: "metoprolol",
    brands: ["lopressor", "toprol", "toprol-xl", "toprol xl"],
    maxDailyMg: 450,
    citation: fda("Metoprolol — maximum daily dose"),
    note: "Tartrate (immediate-release) ceiling 450 mg/day; succinate (extended-release) 400 mg/day. Uses the more permissive value.",
  },
  { ingredient: "atenolol", brands: ["tenormin"], maxDailyMg: 100, citation: fda("Atenolol — maximum daily dose") },
  { ingredient: "carvedilol", brands: ["coreg"], maxDailyMg: 50, citation: fda("Carvedilol — maximum daily dose"), note: "Ceiling is weight-dependent (>85 kg: 100 mg/day). Uses the conservative 50 mg/day." },

  // Statins
  { ingredient: "atorvastatin", brands: ["lipitor"], maxDailyMg: 80, citation: fda("Atorvastatin — maximum daily dose") },
  { ingredient: "rosuvastatin", brands: ["crestor"], maxDailyMg: 40, citation: fda("Rosuvastatin — maximum daily dose") },
  { ingredient: "simvastatin", brands: ["zocor"], maxDailyMg: 40, citation: fda("Simvastatin — maximum daily dose"), note: "80 mg/day is restricted to patients already tolerating it; table uses 40 mg/day." },
  { ingredient: "pravastatin", brands: ["pravachol"], maxDailyMg: 80, citation: fda("Pravastatin — maximum daily dose") },

  // Diabetes
  { ingredient: "metformin", brands: ["glucophage", "glucophage xr", "fortamet", "glumetza"], maxDailyMg: 2550, citation: fda("Metformin — maximum daily dose"), note: "Immediate-release 2550 mg/day; extended-release 2000 mg/day. Uses the more permissive value." },

  // SSRIs
  { ingredient: "sertraline", brands: ["zoloft"], maxDailyMg: 200, citation: fda("Sertraline — maximum daily dose") },
  { ingredient: "escitalopram", brands: ["lexapro"], maxDailyMg: 20, citation: fda("Escitalopram — maximum daily dose") },
  { ingredient: "citalopram", brands: ["celexa"], maxDailyMg: 40, citation: fda("Citalopram — maximum daily dose"), note: "20 mg/day ceiling if >60 years or on CYP2C19 inhibitors; table uses the general 40 mg/day." },
  { ingredient: "fluoxetine", brands: ["prozac"], maxDailyMg: 80, citation: fda("Fluoxetine — maximum daily dose") },
  { ingredient: "paroxetine", brands: ["paxil"], maxDailyMg: 50, citation: fda("Paroxetine — maximum daily dose") },

  // Thyroid — note the sub-mg scale (300 mcg = 0.3 mg)
  { ingredient: "levothyroxine", brands: ["synthroid", "levoxyl", "unithroid"], maxDailyMg: 0.3, citation: fda("Levothyroxine — usual maximum daily dose"), note: "Dosing is titrated to TSH; 0.3 mg (300 mcg)/day is a practical upper reference, not a hard cap." },

  // PPIs
  { ingredient: "omeprazole", brands: ["prilosec"], maxDailyMg: 40, citation: fda("Omeprazole — usual maximum maintenance daily dose") },
  { ingredient: "pantoprazole", brands: ["protonix"], maxDailyMg: 40, citation: fda("Pantoprazole — usual maximum maintenance daily dose") },

  // Neuropathic
  { ingredient: "gabapentin", brands: ["neurontin"], maxDailyMg: 3600, citation: fda("Gabapentin — maximum daily dose") },
];

// Normalized lookup: matches a free-text medication name to a rule by ingredient
// or brand, using whole-word matching so "metoprolol succinate" resolves and
// "co-amilozide" does not accidentally hit "amlodipine".
export function matchDoseRule(medicationName: string): DoseRule | null {
  const words = new Set(
    medicationName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter(Boolean),
  );
  for (const rule of DOSE_RULES) {
    if (words.has(rule.ingredient)) return rule;
    for (const brand of rule.brands) {
      // brand may itself be multi-word (e.g. "toprol xl"); match if all its
      // tokens are present.
      const brandTokens = brand.split(/[\s-]+/).filter(Boolean);
      if (brandTokens.every((t) => words.has(t))) return rule;
    }
  }
  return null;
}
