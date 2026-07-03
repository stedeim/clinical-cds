// Curated drug-class table for allergy conflict checking.
//
// Same honesty contract as dosecheck/rules.ts: a small, auditable table of
// class-membership FACTS (amoxicillin IS a penicillin-class antibiotic), not
// clinical judgments. The engine flags a conflict only when a recorded
// allergen maps to a class and a charted medication is a member of that class
// (or a documented cross-reactive class). Anything not in the table is
// honestly unchecked — silence is never a claim of safety.

export interface AllergyClass {
  id: string;
  label: string; // "penicillin-class antibiotics"
  // Lowercase substrings that identify the ALLERGEN as this class
  // (what patients/charts actually write: "penicillin", "sulfa").
  allergenKeywords: string[];
  // Lowercase ingredient/brand tokens that identify a MEDICATION as a member.
  members: string[];
  // Classes with documented cross-reactivity — flagged as a caution, not a
  // direct conflict, with the relationship stated.
  crossReactiveWith?: { classId: string; note: string }[];
}

export const ALLERGY_CLASSES: AllergyClass[] = [
  {
    id: "penicillins",
    label: "penicillin-class antibiotics",
    allergenKeywords: ["penicillin", "pcn", "amoxicillin", "ampicillin", "augmentin"],
    members: ["penicillin", "amoxicillin", "ampicillin", "augmentin", "piperacillin", "dicloxacillin", "nafcillin"],
    crossReactiveWith: [
      { classId: "cephalosporins", note: "Cephalosporins share a beta-lactam ring; cross-reactivity is documented (low but real)." },
    ],
  },
  {
    id: "cephalosporins",
    label: "cephalosporin antibiotics",
    allergenKeywords: ["cephalosporin", "cephalexin", "keflex", "ceftriaxone", "cefdinir"],
    members: ["cephalexin", "keflex", "cefuroxime", "ceftriaxone", "cefdinir", "cefazolin", "cefpodoxime"],
    crossReactiveWith: [
      { classId: "penicillins", note: "Penicillins share a beta-lactam ring; cross-reactivity is documented (low but real)." },
    ],
  },
  {
    id: "sulfonamides",
    label: "sulfonamide antibiotics",
    allergenKeywords: ["sulfa", "sulfonamide", "sulfamethoxazole", "bactrim", "septra"],
    members: ["sulfamethoxazole", "bactrim", "septra", "trimethoprim-sulfamethoxazole", "sulfadiazine", "sulfasalazine"],
  },
  {
    id: "nsaids",
    label: "NSAIDs / aspirin",
    allergenKeywords: ["aspirin", "asa", "nsaid", "ibuprofen", "naproxen"],
    members: ["aspirin", "ibuprofen", "advil", "motrin", "naproxen", "aleve", "diclofenac", "meloxicam", "indomethacin", "ketorolac", "celecoxib"],
  },
  {
    id: "opioids-codeine",
    label: "codeine-related opioids",
    allergenKeywords: ["codeine", "morphine", "opioid", "opiate"],
    members: ["codeine", "morphine", "hydrocodone", "oxycodone", "hydromorphone", "tramadol"],
  },
  {
    id: "ace-inhibitors",
    label: "ACE inhibitors",
    allergenKeywords: ["ace inhibitor", "lisinopril", "ramipril", "enalapril", "angioedema"],
    members: ["lisinopril", "zestril", "prinivil", "enalapril", "vasotec", "ramipril", "altace", "benazepril", "captopril", "perindopril"],
  },
  {
    id: "statins",
    label: "statins",
    allergenKeywords: ["statin", "atorvastatin", "simvastatin", "rosuvastatin"],
    members: ["atorvastatin", "lipitor", "simvastatin", "zocor", "rosuvastatin", "crestor", "pravastatin", "lovastatin"],
  },
  {
    id: "macrolides",
    label: "macrolide antibiotics",
    allergenKeywords: ["erythromycin", "azithromycin", "macrolide", "zithromax", "z-pack"],
    members: ["erythromycin", "azithromycin", "zithromax", "clarithromycin", "biaxin"],
  },
  {
    id: "fluoroquinolones",
    label: "fluoroquinolone antibiotics",
    allergenKeywords: ["ciprofloxacin", "cipro", "levofloxacin", "fluoroquinolone", "quinolone"],
    members: ["ciprofloxacin", "cipro", "levofloxacin", "levaquin", "moxifloxacin", "ofloxacin"],
  },
];

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/[\s/-]+/)
    .filter(Boolean);
}

// Match a recorded allergen string to the classes it names. Whole-token
// matching for single-word keywords; substring for multi-word ("ace inhibitor").
export function classesForAllergen(substance: string): AllergyClass[] {
  const text = substance.toLowerCase();
  const toks = new Set(tokens(substance));
  return ALLERGY_CLASSES.filter((c) =>
    c.allergenKeywords.some((k) => (k.includes(" ") ? text.includes(k) : toks.has(k))),
  );
}

// Is this medication a member of the class? Whole-token matching against the
// med name so "co-amoxiclav" style hyphenations still resolve.
export function medicationInClass(medName: string, cls: AllergyClass): boolean {
  const toks = new Set(tokens(medName));
  return cls.members.some((m) => (m.includes(" ") ? medName.toLowerCase().includes(m) : toks.has(m)));
}
