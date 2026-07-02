import type { GuidelineFramework } from "../types";

// Regional prescribing-pattern library — layer 2 of the region vision.
//
// Bootstrapped from PUBLIC datasets (no user network needed yet):
//   • United States — CMS Medicare Part D prescriber/drug data
//   • England       — NHS OpenPrescribing (EBM DataLab)
//   • Canada/Australia — national prescribing statistics (PBS, CIHI)
// Entries are RANK-BASED, deliberately: "among the most dispensed" is
// defensible from these datasets; a precise "60%" is not — percentages appear
// only when Pabaid's own opt-in network accumulates real data (see
// prescribing_events migration). Regions/conditions we can't source stay
// absent — the card simply doesn't render. Descriptive, never directive:
// this shows what peers commonly prescribe, it never says what to prescribe.

export interface RegionalPattern {
  id: string;
  framework: GuidelineFramework; // region key (country-level today; subregions come with network data)
  regionLabel: string; // "United States", "England"
  conditionLabel: string; // card heading, e.g. "Hypertension"
  bullets: string[];
  source: string; // dataset + vintage, e.g. "CMS Medicare Part D, 2023"
  codePrefixes: string[];
  keywords: string[];
}

const HTN = { codePrefixes: ["I10", "I11", "I12", "I13"], keywords: ["hypertension", "high blood pressure"] };
const DM2 = { codePrefixes: ["E11"], keywords: ["type 2 diabetes", "t2dm", "diabetes mellitus type 2"] };
const LIPIDS = { codePrefixes: ["E78"], keywords: ["hyperlipidemia", "dyslipidemia", "high cholesterol"] };
const DEPRESSION = { codePrefixes: ["F32", "F33"], keywords: ["depression", "major depressive"] };
const GERD = { codePrefixes: ["K21"], keywords: ["gerd", "reflux", "gastroesophageal"] };

export const REGIONAL_PATTERNS: RegionalPattern[] = [
  // ---------------- United States (CMS Medicare Part D) ----------------
  {
    id: "us-htn",
    framework: "US",
    regionLabel: "United States",
    conditionLabel: "Hypertension",
    bullets: [
      "Lisinopril and amlodipine are consistently among the most-dispensed antihypertensives in Medicare Part D.",
      "Losartan leads ARBs; hydrochlorothiazide remains the most common thiazide.",
      "Metoprolol is the most-dispensed beta blocker (often for co-existing indications).",
    ],
    source: "CMS Medicare Part D, 2023",
    ...HTN,
  },
  {
    id: "us-dm2",
    framework: "US",
    regionLabel: "United States",
    conditionLabel: "Type 2 diabetes",
    bullets: [
      "Metformin remains the most-dispensed oral agent by a wide margin.",
      "SGLT2 inhibitors (empagliflozin) and GLP-1 agonists (semaglutide) are the fastest-growing classes.",
      "Glipizide persists as the most common sulfonylurea despite declining use.",
    ],
    source: "CMS Medicare Part D, 2023",
    ...DM2,
  },
  {
    id: "us-lipids",
    framework: "US",
    regionLabel: "United States",
    conditionLabel: "Hyperlipidemia",
    bullets: [
      "Atorvastatin is the most-dispensed statin nationally; rosuvastatin second and rising.",
      "Simvastatin continues to decline; ezetimibe is the most common add-on.",
    ],
    source: "CMS Medicare Part D, 2023",
    ...LIPIDS,
  },
  {
    id: "us-depression",
    framework: "US",
    regionLabel: "United States",
    conditionLabel: "Depression",
    bullets: [
      "Sertraline is the most-prescribed antidepressant; escitalopram close behind.",
      "Bupropion and trazodone are the most common non-SSRI choices.",
    ],
    source: "CMS Medicare Part D, 2023",
    ...DEPRESSION,
  },
  {
    id: "us-gerd",
    framework: "US",
    regionLabel: "United States",
    conditionLabel: "GERD",
    bullets: [
      "Omeprazole and pantoprazole dominate PPI dispensing.",
      "Famotidine is the most common H2 blocker since ranitidine's withdrawal.",
    ],
    source: "CMS Medicare Part D, 2023",
    ...GERD,
  },

  // ---------------- England (NHS OpenPrescribing) ----------------
  {
    id: "uk-htn",
    framework: "UK_NICE",
    regionLabel: "England",
    conditionLabel: "Hypertension",
    bullets: [
      "Amlodipine and ramipril top antihypertensive prescribing — ramipril, not lisinopril, is the dominant ACE inhibitor (a notable divergence from US practice).",
      "Losartan and candesartan lead ARBs; indapamide is preferred over hydrochlorothiazide (per NICE).",
    ],
    source: "NHS OpenPrescribing, 2024",
    ...HTN,
  },
  {
    id: "uk-dm2",
    framework: "UK_NICE",
    regionLabel: "England",
    conditionLabel: "Type 2 diabetes",
    bullets: [
      "Metformin is the most-prescribed glucose-lowering agent.",
      "Gliclazide (rare in the US) remains England's dominant sulfonylurea; SGLT2 inhibitor use is growing rapidly.",
    ],
    source: "NHS OpenPrescribing, 2024",
    ...DM2,
  },
  {
    id: "uk-lipids",
    framework: "UK_NICE",
    regionLabel: "England",
    conditionLabel: "Hyperlipidemia",
    bullets: [
      "Atorvastatin dominates (NICE first-line at 20 mg for primary prevention).",
      "Simvastatin retains a larger share than in the US; ezetimibe is the usual add-on.",
    ],
    source: "NHS OpenPrescribing, 2024",
    ...LIPIDS,
  },
  {
    id: "uk-depression",
    framework: "UK_NICE",
    regionLabel: "England",
    conditionLabel: "Depression",
    bullets: [
      "Sertraline is the most-prescribed antidepressant in England.",
      "Mirtazapine holds an unusually large share versus US practice; citalopram remains common.",
    ],
    source: "NHS OpenPrescribing, 2024",
    ...DEPRESSION,
  },
  {
    id: "uk-gerd",
    framework: "UK_NICE",
    regionLabel: "England",
    conditionLabel: "GERD",
    bullets: [
      "Omeprazole and lansoprazole lead PPI prescribing (lansoprazole far more common than in the US).",
    ],
    source: "NHS OpenPrescribing, 2024",
    ...GERD,
  },

  // ---------------- Canada / Australia (where confidently sourced) ----------------
  {
    id: "ca-htn",
    framework: "CA",
    regionLabel: "Canada",
    conditionLabel: "Hypertension",
    bullets: [
      "Amlodipine, ramipril, and perindopril are among the most-dispensed antihypertensives — ACE-i choice skews to ramipril/perindopril rather than lisinopril.",
    ],
    source: "CIHI prescribing statistics, 2023",
    ...HTN,
  },
  {
    id: "ca-lipids",
    framework: "CA",
    regionLabel: "Canada",
    conditionLabel: "Hyperlipidemia",
    bullets: [
      "Rosuvastatin holds a notably larger share than in the US; atorvastatin close behind.",
    ],
    source: "CIHI prescribing statistics, 2023",
    ...LIPIDS,
  },
  {
    id: "au-htn",
    framework: "AU",
    regionLabel: "Australia",
    conditionLabel: "Hypertension",
    bullets: [
      "Perindopril is Australia's dominant ACE inhibitor (unlike US lisinopril); amlodipine leads CCBs.",
      "Telmisartan and candesartan are the most-dispensed ARBs on the PBS.",
    ],
    source: "PBS statistics, 2023–24",
    ...HTN,
  },
  {
    id: "au-lipids",
    framework: "AU",
    regionLabel: "Australia",
    conditionLabel: "Hyperlipidemia",
    bullets: [
      "Rosuvastatin and atorvastatin dominate PBS lipid-lowering dispensing, with rosuvastatin first.",
    ],
    source: "PBS statistics, 2023–24",
    ...LIPIDS,
  },
];
