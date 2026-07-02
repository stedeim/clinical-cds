import { z } from "zod";
import { FRAMEWORK_IDS } from "../guidelines";

// The structured CDS response contract.
//
// This schema is the enforcement point for the Non-Device CDS framing and the
// explainability moat. The model MUST return JSON matching this shape; the
// engine validates against it and rejects anything that doesn't parse. If the
// model tries to emit a directive ("order X", "prescribe Y") it has no field to
// put it in — the schema only affords *options* and *considerations*.

export const EvidenceStrength = z.enum(["strong", "moderate", "weak", "uncertain"]);

// Every reasoning unit must point back to the patient data it used. This is how
// the UI renders "key data points the model used" without trusting prose.
export const DataPointRef = z.object({
  // A short human label, e.g. "Cr 1.8 mg/dL" or "age 72".
  label: z.string().min(1),
  // Why this data point mattered to the suggestion.
  relevance: z.string().min(1),
});

export const Differential = z.object({
  condition: z.string().min(1),
  // Bucketing required by the encounter-native output spec.
  category: z.enum(["likely", "cant_miss", "possible"]),
  // Plain-language rationale — doubles as the teaching point.
  rationale: z.string().min(1),
  evidence: EvidenceStrength,
  supportingData: z.array(DataPointRef).default([]),
});

export const WorkupOption = z.object({
  test: z.string().min(1),
  rationale: z.string().min(1),
  evidence: EvidenceStrength,
});

export const ManagementOption = z.object({
  option: z.string().min(1),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  evidence: EvidenceStrength,
});

export const Citation = z.object({
  title: z.string().min(1),
  source: z.string().min(1), // e.g. "NICE NG12", "UpToDate", "FDA label"
  url: z.string().url().optional(),
  framework: z.enum([...FRAMEWORK_IDS, "other"]).default("other"),
});

export const TeachingPoint = z.object({
  point: z.string().min(1),
  // Which guideline criterion / mechanism this expands on.
  basis: z.string().min(1),
});

export const CdsResponse = z.object({
  // One short paragraph. Framed as support, never a command.
  summary: z.string().min(1),
  // The data the model says it relied on. Rendered prominently for transparency.
  dataPointsUsed: z.array(DataPointRef).min(1),
  differentials: z.array(Differential).default([]),
  workup: z.array(WorkupOption).default([]),
  management: z.array(ManagementOption).default([]),
  reasoningSummary: z.string().min(1),
  teaching: z.array(TeachingPoint).default([]),
  citations: z.array(Citation).default([]),
  // Surfaced risk/uncertainty labels, e.g. "Limited evidence in this population".
  uncertainties: z.array(z.string()).default([]),
  // Hard safety backstop. Always present in the rendered UI.
  disclaimer: z.string().min(1),
});

export type CdsResponse = z.infer<typeof CdsResponse>;
export type Differential = z.infer<typeof Differential>;
export type EvidenceStrength = z.infer<typeof EvidenceStrength>;

export const STANDARD_DISCLAIMER =
  "Decision support only. These are considerations to inform — not replace — " +
  "your clinical judgment. No orders, prescriptions, or EHR changes are made by " +
  "this tool. Verify against current guidelines and your patient's full context.";
