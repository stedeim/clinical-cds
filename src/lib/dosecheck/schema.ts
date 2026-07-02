import { z } from "zod";

// The dose-check contract.
//
// A DoseFinding is a cited *consideration*, never a command — it stays inside
// the same Non-Device CDS framing as cds/schema.ts. The enforcement here: every
// finding that flags something (exceeds / below_threshold) MUST carry a
// citation. A flag without a source is a contract violation and is rejected, so
// the UI can never render an uncited red banner (the exact failure mode of the
// old mock's fabricated "200 mg exceeds max"). "ok" and "unknown" carry no
// citation and render nothing — silence beats a false alarm.

export const DoseStatus = z.enum([
  "ok", // within the reference range
  "exceeds", // above the reference maintenance ceiling
  "below_threshold", // below a meaningful/again reference floor
  "unparseable", // the dose string couldn't be read as a number+unit
  "unknown", // drug not in the reference table (RxNorm/doseRules) — never a guess
]);

// A reference citation, matching the shape used by cds/schema.ts Citation so the
// UI can render both the same way.
export const DoseCitation = z.object({
  title: z.string().min(1),
  source: z.string().min(1), // e.g. "RxNorm", "DailyMed", "FDA label"
  url: z.string().url().optional(),
});

// A statuses set that represents an active flag the clinician should see.
const FLAGGING_STATUSES: ReadonlyArray<z.infer<typeof DoseStatus>> = ["exceeds", "below_threshold"];

export const DoseFinding = z
  .object({
    medication: z.string().min(1), // echoes Medication.name
    rxcui: z.string().min(1).nullable(), // null if RxNorm couldn't resolve it
    ingredient: z.string().min(1).nullable(),
    // The total DAILY dose in mg that was compared against the ceiling
    // (single administration × frequency-per-day). null if unparseable/unknown.
    parsedDoseMg: z.number().nonnegative().nullable(),
    ceilingMg: z.number().positive().nullable(), // max daily dose, from doseRules
    status: DoseStatus,
    // Clinician-facing, option-framed, never imperative.
    message: z.string().min(1),
    citation: DoseCitation.nullable().default(null),
  })
  .superRefine((finding, ctx) => {
    // A flag MUST be cited. This is the dose-check analogue of the CDS
    // citations requirement and the direct fix for uncited banners.
    if (FLAGGING_STATUSES.includes(finding.status) && finding.citation === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `a '${finding.status}' finding must carry a citation`,
        path: ["citation"],
      });
    }
  });

// The engine returns one finding per input medication, in the same order.
export const DoseCheckResult = z.array(DoseFinding);

export type DoseStatus = z.infer<typeof DoseStatus>;
export type DoseCitation = z.infer<typeof DoseCitation>;
export type DoseFinding = z.infer<typeof DoseFinding>;
export type DoseCheckResult = z.infer<typeof DoseCheckResult>;
