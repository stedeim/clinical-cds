import type { CaseContext } from "../types";
import type { TranscriptSegment } from "./schema";

// ===========================================================================
// THE NOTE-GENERATION PROMPT — the provenance core of the scribe.
//
// The moat this product sells is that every clause of the note is attributable:
// the clinician can see, at a glance, which words were SPOKEN (grounded in the
// ambient transcript), which were STRUCTURED (lifted verbatim from the chart),
// and which were INFERRED (the model's connective tissue, un-grounded, to be
// confirmed). The schema (note/schema.ts) enforces the tag/source consistency;
// this prompt is where we teach the model to earn those tags honestly.
//
// The single most important rule below is #4: the model may NEVER fabricate an
// exam finding. With no transcript, the objective section is structured-only or
// empty. That is the "exam left blank unless grounded" moat, stated in prose so
// the model can't rationalize around it.
// ===========================================================================

export const SYSTEM_PROMPT = `You are the documentation engine inside Pabaid, an ambient scribe for LICENSED CLINICIANS. You draft a SOAP note from an encounter's structured chart data and (when present) an ambient transcript. You assist documentation; the clinician reviews, edits, and signs. You never finalize a note.

Every span of text you emit MUST be tagged with its provenance. This attribution is the product; a mis-tagged span is a defect, not a stylistic choice.

PROVENANCE RULES (absolute):

1. "structured" — text lifted VERBATIM from a discrete chart field (a vital, lab, problem, or medication). Its sourceRef names that field (e.g. "vital:BP", "lab:Cr", "problem:0", "med:1") and its confidence is exactly 1.0. Do not paraphrase a structured value; if you rephrase it, it is no longer structured.

2. "spoken" — text grounded in a specific transcript segment the patient or clinician actually said. Its sourceRef is that segment's id. Only use this when a transcript is provided AND a segment supports the text. confidence reflects how directly the segment supports the span.

3. "inferred" — connective or summarizing text you supplied that no field and no transcript segment grounds. Its sourceRef MUST be null. This is the amber "please confirm" text in the UI, so use it honestly and sparingly: narrative glue, not invented facts.

4. NEVER FABRICATE THE EXAM. The objective/exam section may contain ONLY "structured" spans (vitals, labs) or, with a transcript, "spoken" spans — NEVER a "spoken" exam finding you invented and NEVER an "inferred" physical-exam finding (no "lungs clear", "abdomen soft", etc. unless a real source grounds it). If there is nothing to put there, leave the section empty. An empty exam is correct; a plausible-sounding invented exam is a serious defect.

5. NO ORDERS, NO DIRECTIVES. The plan section documents the existing medication/problem list and any spoken plan; it does not invent new prescriptions or imperatives.

6. STAY GROUNDED. When in doubt about whether something is grounded, either tag it "inferred" (sourceRef null) or omit it. Prefer a shorter, fully-attributable note over a fuller, partly-fabricated one.

You MUST respond with a single JSON object matching the provided schema. No prose outside the JSON.`;

// Builds the user message carrying the case payload and (optional) transcript.
export function buildUserPrompt(args: {
  caseContext: CaseContext;
  transcript?: TranscriptSegment[];
}): string {
  const { caseContext, transcript } = args;
  const { patient, encounter } = caseContext;

  const lines: string[] = [];
  lines.push(`ENCOUNTER ID: ${encounter.id}`);
  lines.push("");
  lines.push("PATIENT (de-identified):");
  lines.push(`- Age: ${patient.ageYears ?? "unknown"}`);
  lines.push(`- Sex: ${patient.sex ?? "unknown"}`);
  lines.push("");

  lines.push("STRUCTURED CHART FIELDS (use these verbatim as 'structured' spans; sourceRef in parentheses):");
  if (encounter.chiefComplaint) lines.push(`- Chief complaint (encounter:chiefComplaint): ${encounter.chiefComplaint}`);
  if (encounter.hpi) lines.push(`- HPI (encounter:hpi): ${encounter.hpi}`);
  encounter.problems.forEach((p, i) => {
    lines.push(`- Problem (problem:${i}): ${p.label}${p.code ? ` (${p.code})` : ""}`);
  });
  encounter.medications.forEach((m, i) => {
    lines.push(`- Medication (med:${i}): ${[m.name, m.dose, m.route, m.frequency].filter(Boolean).join(" ")}`);
  });
  encounter.vitals.forEach((v) => {
    lines.push(`- Vital (vital:${v.name}): ${v.name} ${v.value}${v.unit ? " " + v.unit : ""}`);
  });
  encounter.labs.forEach((l) => {
    const value = l.value ?? l.valueText ?? "";
    lines.push(`- Lab (lab:${l.name}): ${l.name} ${value}${l.unit ? " " + l.unit : ""}`);
  });

  lines.push("");
  if (transcript && transcript.length) {
    lines.push("AMBIENT TRANSCRIPT (ground 'spoken' spans in these; sourceRef is the segment id):");
    transcript.forEach((seg) => {
      lines.push(`- [${seg.id}] ${seg.speaker}: ${seg.text}`);
    });
  } else {
    lines.push(
      "AMBIENT TRANSCRIPT: none provided. Do NOT emit any 'spoken' spans. The note must be " +
        "built from the structured fields above ('structured' spans) plus, only where genuinely " +
        "needed, 'inferred' narrative glue (sourceRef null). Leave the objective/exam section empty " +
        "unless a structured vital/lab belongs there.",
    );
  }

  lines.push("");
  lines.push(
    "Draft the SOAP note as ordered sections (subjective, objective, assessment, plan). " +
      "Attribute every span per the rules. Return only the JSON object described by the schema.",
  );

  return lines.join("\n");
}

// The JSON shape description handed to the model alongside the schema-validated
// parse. Kept in sync with note/schema.ts.
export const RESPONSE_FORMAT_HINT = `Return JSON with exactly these keys:
{
  "encounterId": string,
  "sections": [
    {
      "heading": "subjective"|"objective"|"assessment"|"plan",
      "spans": [
        { "text": string, "provenance": "spoken"|"structured"|"inferred", "sourceRef": string|null, "confidence": number }
      ]
    }
  ],
  "transcriptId": string|null
}
Rules the JSON must satisfy (the response is rejected otherwise):
- a "structured" span: sourceRef is the chart field name (non-null), confidence is exactly 1.0
- a "spoken" span: sourceRef is a transcript segment id (non-null)
- an "inferred" span: sourceRef is null
- no "spoken" span may appear in the "objective" section
Do not include "model" or "generatedAt"; those are stamped by the server.`;
