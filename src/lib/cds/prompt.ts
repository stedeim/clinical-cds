import type { CaseContext } from "../types";
import type { FrameworkProfile } from "../guidelines";

// ===========================================================================
// THE CDS PROMPT TEMPLATE — the regulatory and product core of Consilium.
//
// Every guardrail that keeps this product inside FDA Non-Device CDS guidance
// lives here, reinforced by the structured-output schema (cds/schema.ts). The
// system prompt sets the role and the hard boundaries; the user prompt carries
// the assembled (transient) case and the clinician's question.
//
// Why this is in one file: the safety posture should be auditable in a single
// place a reviewer (or regulator) can read end to end.
// ===========================================================================

export const SYSTEM_PROMPT = `You are Consilium, a clinical decision support assistant for LICENSED CLINICIANS only. You support — never replace — the clinician's judgment.

You operate strictly within FDA Non-Device Clinical Decision Support boundaries. These are absolute:

1. OPTIONS, NEVER COMMANDS. Frame everything as considerations, options, possible differentials, or reasonable work-up/management choices. Never instruct, never use imperatives like "order", "prescribe", "give", "start" as directives. The clinician decides and acts; you inform.

2. NO ACTIONS. You do not place orders, write prescriptions, or change any record. You may only describe options the clinician may choose to pursue.

3. INDEPENDENT REVIEW MUST BE POSSIBLE. Your value is that a clinician can review your basis and reach their own conclusion. Therefore EVERY response must expose: (a) the specific patient data points you relied on, (b) a plain-language reasoning summary, (c) citations to guidelines/labels/trials, and (d) an evidence-strength label per recommendation.

4. SCOPE. Outpatient primary care and urgent care; non-ICU, non-ED, non-time-critical. If the case looks time-critical or emergent (e.g., suggests ACS, stroke, sepsis, anaphylaxis), your summary must say so plainly and advise the clinician to escalate per local emergency pathways — do not provide a leisurely work-up plan for an emergency.

5. INPUT LIMITS. You reason only over text and discrete data (demographics, symptoms, exam findings, single lab values, vitals, problems, meds, allergies). You never interpret images, ECG/waveforms, or device streams. If asked to, decline and say it is out of scope.

6. UNCERTAINTY IS A FEATURE. Name what is uncertain, where evidence is weak or absent in this population, and which serious diagnoses are "can't-miss but less likely".

You MUST respond with a single JSON object matching the provided schema. No prose outside the JSON. If you cannot answer safely within scope, still return the JSON with an explanatory summary and an empty differentials/workup/management list.`;

// Builds the framework-aware user message carrying the transient case payload.
export function buildUserPrompt(args: {
  caseContext: CaseContext;
  question: string;
  framework: FrameworkProfile;
}): string {
  const { caseContext, question, framework } = args;
  const { patient, encounter } = caseContext;

  const lines: string[] = [];
  lines.push(`GUIDELINE FRAMEWORK: ${framework.label}`);
  lines.push(framework.guidance);
  lines.push(`Preferred primary sources for citation: ${framework.preferredSources.join(", ")}.`);
  lines.push("");
  lines.push("PATIENT (de-identified):");
  lines.push(`- Age: ${patient.ageYears ?? "unknown"}`);
  lines.push(`- Sex: ${patient.sex ?? "unknown"}`);
  lines.push("");
  lines.push("ENCOUNTER:");
  if (encounter.chiefComplaint) lines.push(`- Chief complaint: ${encounter.chiefComplaint}`);
  if (encounter.hpi) lines.push(`- HPI: ${encounter.hpi}`);

  if (encounter.problems.length) {
    lines.push(`- Problems: ${encounter.problems.map((p) => p.label).join("; ")}`);
  }
  if (encounter.medications.length) {
    lines.push(
      `- Medications: ${encounter.medications
        .map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(" "))
        .join("; ")}`,
    );
  }
  if (encounter.allergies.length) {
    lines.push(
      `- Allergies: ${encounter.allergies
        .map((a) => [a.substance, a.reaction && `(${a.reaction})`].filter(Boolean).join(" "))
        .join("; ")}`,
    );
  }
  if (encounter.vitals.length) {
    lines.push(
      `- Vitals: ${encounter.vitals
        .map((v) => `${v.name} ${v.value}${v.unit ? " " + v.unit : ""}`)
        .join("; ")}`,
    );
  }
  if (encounter.labs.length) {
    lines.push(
      `- Labs: ${encounter.labs
        .map((l) => `${l.name} ${l.value ?? l.valueText ?? ""}${l.unit ? " " + l.unit : ""}`)
        .join("; ")}`,
    );
  }

  lines.push("");
  lines.push(`CLINICIAN'S QUESTION: ${question}`);
  lines.push("");
  lines.push(
    "Reason about THIS patient specifically. Tie each suggestion to the data above. " +
      "Return only the JSON object described by the schema.",
  );

  return lines.join("\n");
}

// The JSON shape description handed to the model alongside the schema-validated
// parse. Kept in sync with cds/schema.ts.
export const RESPONSE_FORMAT_HINT = `Return JSON with exactly these keys:
{
  "summary": string,
  "dataPointsUsed": [{ "label": string, "relevance": string }],
  "differentials": [{ "condition": string, "category": "likely"|"cant_miss"|"possible", "rationale": string, "evidence": "strong"|"moderate"|"weak"|"uncertain", "supportingData": [{ "label": string, "relevance": string }] }],
  "workup": [{ "test": string, "rationale": string, "evidence": "strong"|"moderate"|"weak"|"uncertain" }],
  "management": [{ "option": string, "pros": string[], "cons": string[], "evidence": "strong"|"moderate"|"weak"|"uncertain" }],
  "reasoningSummary": string,
  "teaching": [{ "point": string, "basis": string }],
  "citations": [{ "title": string, "source": string, "url"?: string, "framework": "US"|"UK_NICE"|"WHO"|"other" }],
  "uncertainties": string[],
  "disclaimer": string
}`;
