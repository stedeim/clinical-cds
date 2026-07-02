// Curated cheat-sheet library for auto-surfaced guideline summaries (Moat 4's
// unprompted half: the panel that reacts to the chart without being asked).
//
// Same honesty contract as dosecheck/rules.ts: a small, auditable, cited table
// — NOT an LLM call. Unprompted content must never be generated content; a
// clinician who didn't ask a question should only ever see text a human curated
// against the named source. Problems not in the library surface nothing —
// silence beats an uncited card. Source tags are honest names (no fabricated
// URLs), matching the citation style used across the app.

export interface CheatSheet {
  id: string; // stable topic id, e.g. "hypertension"
  topic: string; // card label, e.g. "Hypertension"
  title: string; // e.g. "First-line management"
  bullets: string[];
  sources: string[]; // e.g. ["ACC/AHA 2017", "JNC8"]
  // Matchers against the encounter's problem list.
  codePrefixes: string[]; // ICD-10 prefixes, e.g. ["I10"]
  keywords: string[]; // lowercase substrings matched against the problem label
}

export const CHEAT_SHEETS: CheatSheet[] = [
  {
    id: "hypertension",
    topic: "Hypertension",
    title: "First-line management",
    bullets: [
      "Thiazide, ACE-i / ARB, or CCB first-line (ACC/AHA 2017).",
      "Target <130/80 mmHg for most adults.",
      "Reassess 2–4 wks after a dose change; monitor K⁺/creatinine on ACE-i or ARB.",
    ],
    sources: ["ACC/AHA 2017", "JNC8"],
    codePrefixes: ["I10", "I11", "I12", "I13"],
    keywords: ["hypertension", "high blood pressure"],
  },
  {
    id: "diabetes-t2",
    topic: "Type 2 diabetes",
    title: "Management essentials",
    bullets: [
      "Metformin first-line unless eGFR <30 mL/min/1.73 m².",
      "A1c target ~7% for most adults; individualize (comorbidity, hypoglycemia risk).",
      "Annually: dilated eye exam, foot exam, urine albumin-to-creatinine ratio.",
    ],
    sources: ["ADA Standards of Care"],
    codePrefixes: ["E11"],
    keywords: ["type 2 diabetes", "t2dm", "diabetes mellitus type 2"],
  },
  {
    id: "hyperlipidemia",
    topic: "Hyperlipidemia",
    title: "Statin decision points",
    bullets: [
      "High-intensity statin for clinical ASCVD or LDL-C ≥190 mg/dL.",
      "For primary prevention (40–75 y), base moderate-intensity statin on 10-yr ASCVD risk ≥7.5%.",
      "Recheck lipids 4–12 wks after starting, then every 3–12 months.",
    ],
    sources: ["ACC/AHA 2018", "USPSTF"],
    codePrefixes: ["E78"],
    keywords: ["hyperlipidemia", "dyslipidemia", "high cholesterol"],
  },
  {
    id: "asthma",
    topic: "Asthma",
    title: "Stepwise essentials",
    bullets: [
      "ICS-formoterol as-needed is the preferred reliever strategy (GINA).",
      "Symptoms >2 days/wk or nocturnal waking → step up controller therapy.",
      "Check inhaler technique and adherence before every step-up.",
    ],
    sources: ["GINA"],
    codePrefixes: ["J45"],
    keywords: ["asthma"],
  },
  {
    id: "copd",
    topic: "COPD",
    title: "Management essentials",
    bullets: [
      "Confirm with spirometry: post-bronchodilator FEV₁/FVC <0.70.",
      "LAMA (or LAMA/LABA) first-line for most symptomatic patients.",
      "Smoking cessation and vaccination (influenza, pneumococcal, COVID) at every visit.",
    ],
    sources: ["GOLD"],
    codePrefixes: ["J44"],
    keywords: ["copd", "chronic obstructive"],
  },
  {
    id: "depression",
    topic: "Depression",
    title: "Initial management",
    bullets: [
      "SSRI first-line; combine with psychotherapy when available.",
      "Reassess response at 4–6 wks before switching or augmenting.",
      "Assess suicide risk at diagnosis and at each follow-up.",
    ],
    sources: ["APA", "USPSTF"],
    codePrefixes: ["F32", "F33"],
    keywords: ["depression", "major depressive"],
  },
  {
    id: "knee-oa",
    topic: "Knee osteoarthritis",
    title: "First-line management",
    bullets: [
      "Exercise therapy and weight management are first-line for all patients.",
      "Topical NSAIDs before oral NSAIDs; acetaminophen has modest benefit.",
      "X-ray only if diagnosis unclear or symptoms persist despite therapy.",
    ],
    sources: ["ACR 2019", "AAOS"],
    codePrefixes: ["M17", "M25.56"],
    keywords: ["knee osteoarthritis", "knee pain", "osteoarthritis"],
  },
  {
    id: "gerd",
    topic: "GERD",
    title: "Management essentials",
    bullets: [
      "4–8 wk once-daily PPI trial for typical symptoms.",
      "Alarm features (dysphagia, weight loss, bleeding, anemia) → endoscopy.",
      "Step down to the lowest effective dose once controlled.",
    ],
    sources: ["ACG 2022"],
    codePrefixes: ["K21"],
    keywords: ["gerd", "reflux", "gastroesophageal"],
  },
];
