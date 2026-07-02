import { z } from "zod";

// The generated-note contract.
//
// Like cds/schema.ts, this schema is the enforcement point for a product moat —
// here it is PROVENANCE. Every clause of the note is a span tagged with where it
// came from, and the schema makes the tag and its source structurally
// consistent: an "inferred" span CANNOT claim a source, and the objective
// (exam) section CANNOT contain a "spoken" finding. That keeps the amber
// "inferred" highlight in the UI honest, and keeps the "exam left blank unless
// grounded" moat true at the type level rather than by convention.
//
// Engine output is validated against this before it can reach the UI. An
// unattributed note is rejected, not rendered.

// Where a span's text came from:
//  - spoken:     grounded in a transcript segment the patient/clinician said
//  - structured: lifted verbatim from a chart field (vital, lab, problem, med)
//  - inferred:   the model filled it in; nothing in the record grounds it, so
//                the clinician must confirm it
export const ProvenanceKind = z.enum(["spoken", "structured", "inferred"]);

// A contiguous run of note text with a single provenance.
export const NoteSpan = z
  .object({
    text: z.string().min(1),
    provenance: ProvenanceKind,
    // For "spoken": id of the transcript segment that grounds this span.
    // For "structured": the chart field it was lifted from, e.g. "vital:BP",
    //   "lab:Cr", "problem:0", "med:1".
    // For "inferred": MUST be null — nothing grounds it.
    sourceRef: z.string().min(1).nullable(),
    // 1.0 for structured lifts (deterministic); model-scored for spoken/inferred.
    confidence: z.number().min(0).max(1),
  })
  .superRefine((span, ctx) => {
    const grounded = span.provenance === "spoken" || span.provenance === "structured";
    if (grounded && span.sourceRef === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${span.provenance} span must carry a non-null sourceRef`,
        path: ["sourceRef"],
      });
    }
    if (span.provenance === "inferred" && span.sourceRef !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "inferred span must have sourceRef === null (it claims no source)",
        path: ["sourceRef"],
      });
    }
    if (span.provenance === "structured" && span.confidence !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "structured span must have confidence 1.0 (deterministic lift)",
        path: ["confidence"],
      });
    }
  });

export const NoteHeading = z.enum(["subjective", "objective", "assessment", "plan"]);

// One SOAP section, as an ordered list of spans.
export const NoteSection = z
  .object({
    heading: NoteHeading,
    spans: z.array(NoteSpan).default([]),
  })
  .superRefine((section, ctx) => {
    // The exam is never dictated in this scope. The model may lift objective
    // findings from structured data or leave the section to be inferred/blank,
    // but it may NEVER emit a "spoken" exam finding. This is the "exam left
    // blank" moat, enforced structurally.
    if (section.heading === "objective") {
      section.spans.forEach((span, i) => {
        if (span.provenance === "spoken") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "objective (exam) spans may not be 'spoken'",
            path: ["spans", i, "provenance"],
          });
        }
      });
    }
  });

// A single utterance from the ambient scribe. Absent until that capability
// exists; the note engine accepts an optional list of these as its grounding
// source for "spoken" spans.
export const TranscriptSegment = z.object({
  id: z.string().min(1),
  speaker: z.enum(["clinician", "patient", "other"]),
  text: z.string().min(1),
  // Seconds from start of recording; optional so text-only transcripts validate.
  startSec: z.number().min(0).optional(),
  endSec: z.number().min(0).optional(),
});

export const GeneratedNote = z.object({
  encounterId: z.string().min(1),
  sections: z.array(NoteSection).default([]),
  model: z.string().min(1), // model id, or "mock"
  generatedAt: z.string().min(1), // ISO timestamp
  // null until an ambient transcript grounds the note.
  transcriptId: z.string().min(1).nullable().default(null),
});

export type ProvenanceKind = z.infer<typeof ProvenanceKind>;
export type NoteSpan = z.infer<typeof NoteSpan>;
export type NoteHeading = z.infer<typeof NoteHeading>;
export type NoteSection = z.infer<typeof NoteSection>;
export type TranscriptSegment = z.infer<typeof TranscriptSegment>;
export type GeneratedNote = z.infer<typeof GeneratedNote>;
