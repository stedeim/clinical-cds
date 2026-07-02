import type { CaseContext } from "../types";
import type { FrameworkProfile } from "../guidelines";
import { type CdsResponse, STANDARD_DISCLAIMER } from "./schema";

// Deterministic mock CDS engine.
//
// Mirrors Wordhaven's "runs with no keys" stub mode: the entire encounter-native
// flow is demoable without an LLM key. The mock is intentionally generic but
// structurally complete — it exercises every field the UI renders, so the slice
// is honest about the real shape. It reads a couple of case signals (age, a
// renal lab) so the output visibly reflects the patient in front of you.

export function mockCdsResponse(args: {
  caseContext: CaseContext;
  question: string;
  framework: FrameworkProfile;
}): CdsResponse {
  const { caseContext, framework } = args;
  const { patient, encounter } = caseContext;

  const cr = encounter.labs.find((l) => /^cr/i.test(l.name));
  const renalFlag = typeof cr?.value === "number" && cr.value >= 1.5;

  const dataPointsUsed = [
    { label: `Age ${patient.ageYears ?? "unknown"}`, relevance: "Shapes pretest probability and drug dosing." },
    encounter.chiefComplaint
      ? { label: `Chief complaint: ${encounter.chiefComplaint}`, relevance: "Anchors the differential." }
      : { label: "No chief complaint recorded", relevance: "Limits specificity of suggestions." },
    ...(cr
      ? [{ label: `Cr ${cr.value ?? cr.valueText} ${cr.unit ?? ""}`.trim(), relevance: "Gates renally-cleared options." }]
      : []),
  ];

  return {
    summary:
      `[MOCK] Considerations for this ${patient.ageYears ?? "?"}-year-old patient under ${framework.label}. ` +
      `This is illustrative output from stub mode — add ANTHROPIC_API_KEY for live reasoning. ` +
      (renalFlag ? "Note the elevated creatinine when weighing renally-cleared options." : ""),
    dataPointsUsed,
    differentials: [
      {
        condition: "Most likely benign/self-limited cause",
        category: "likely",
        rationale: "Pattern and demographics fit a common outpatient presentation.",
        evidence: "moderate",
        supportingData: dataPointsUsed.slice(0, 1),
      },
      {
        condition: "Serious cause to actively exclude",
        category: "cant_miss",
        rationale: "Less likely here, but high-consequence if missed — worth a deliberate rule-out.",
        evidence: "uncertain",
        supportingData: [],
      },
    ],
    workup: [
      {
        test: "Focused basic labs appropriate to the complaint",
        rationale: "Low-cost, narrows the differential before escalating.",
        evidence: "moderate",
      },
    ],
    management: [
      {
        option: "Conservative outpatient management with safety-netting",
        pros: ["Avoids over-testing", "Appropriate for low-risk presentations"],
        cons: ["Requires reliable follow-up", "Not suitable if red flags emerge"],
        evidence: renalFlag ? "weak" : "moderate",
      },
    ],
    reasoningSummary:
      "Stub reasoning: bucketed a likely cause against a can't-miss cause, proposed a low-cost " +
      "work-up to discriminate, and a conservative plan contingent on safety-netting. Live mode " +
      "replaces this with patient-specific, citation-grounded reasoning.",
    teaching: [
      {
        point: "Separate 'most likely' from 'most dangerous' explicitly.",
        basis: "Diagnostic-reasoning best practice; reduces premature closure.",
      },
    ],
    citations: [
      {
        title: `${framework.preferredSources[0]} — relevant guidance`,
        source: framework.preferredSources[0],
        framework: framework.id,
      },
    ],
    uncertainties: [
      "Stub output — not clinically validated.",
      ...(renalFlag ? ["Renal function may limit standard dosing; confirm before selecting agents."] : []),
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}
