import { z } from "zod";

// Transcript-summary contract.
//
// The point of the summary is to cut fluff, not to editorialize — so every
// point MUST cite the transcript segment(s) it came from (`segmentIds`). A
// point with no grounding is rejected at the schema gate: this is the same
// provenance rule as note spans and dose flags, applied to summarization.
// Three buckets, chosen for how clinicians actually skim:
//   keyPoints          — clinically relevant statements (symptoms, timelines,
//                        meds, functional impact)
//   pertinentNegatives — explicit denials ("no fever", "denies chest pain")
//   patientConcerns    — what the patient is worried about, in their words

export const SummaryPoint = z.object({
  text: z.string().min(1).max(300),
  // Transcript segment ids grounding this point. Never empty.
  segmentIds: z.array(z.string().min(1)).min(1),
});

export const TranscriptSummary = z.object({
  keyPoints: z.array(SummaryPoint).max(10),
  pertinentNegatives: z.array(SummaryPoint).max(10),
  patientConcerns: z.array(SummaryPoint).max(10),
  model: z.string().min(1), // model id, or "mock"
  generatedAt: z.string(),
});

export type SummaryPointT = z.infer<typeof SummaryPoint>;
export type TranscriptSummaryT = z.infer<typeof TranscriptSummary>;
