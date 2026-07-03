import type { GeneratedNote, NoteSpan } from "./schema";
import type { DoseFinding } from "../dosecheck/schema";
import type { DoseDecision } from "../dosecheck/decisions";

// Plain-text serialization of a finished visit note.
//
// This is the "take the note out of the app" seam. It is deliberately a pure
// function (no DOM, no clipboard) so the exact bytes a clinician copies or
// downloads are unit-testable, and so the honesty guarantees survive export:
//   • an `inferred` span is marked "[AI-inferred — confirm]" in the text — the
//     provenance moat must not evaporate the moment the note leaves the screen;
//   • the physical exam is the clinician's OWN authored lines (never templated),
//     rendered under an explicit "entered by clinician" subheading, or an honest
//     "left blank" line when none were entered;
//   • dose cautions are reproduced WITH their citation (same contract the UI
//     enforces — never an uncited flag).

export interface NoteSignature {
  clinicianName: string;
  credential?: string;
  signedAt: string; // ISO timestamp
}

export interface SerializeOptions {
  // Physical-exam findings the clinician typed themselves. Blank lines dropped.
  examLines?: string[];
  // When present, the note is attested at the foot; when null/absent it is a DRAFT.
  signature?: NoteSignature | null;
  // Reproduced as a CAUTIONS block when any finding is flagging (exceeds/below).
  doseFindings?: DoseFinding[];
  // Clinician decisions on flagged findings, keyed by the finding's index in
  // `doseFindings`. A caution with no decision exports as unreviewed.
  doseDecisions?: Record<number, DoseDecision>;
  // Post-signature amendments. A signed note is never edited — it is amended;
  // addenda print AFTER the attestation, each with its own timestamp.
  addenda?: { text: string; at: string }[];
}

const SECTION_ORDER = ["subjective", "objective", "assessment", "plan"] as const;
const HEADING_LABEL: Record<(typeof SECTION_ORDER)[number], string> = {
  subjective: "SUBJECTIVE",
  objective: "OBJECTIVE",
  assessment: "ASSESSMENT",
  plan: "PLAN",
};

export const INFERRED_MARKER = "[AI-inferred — confirm]";

function renderSpan(span: NoteSpan): string {
  // Inferred content carries a visible confirm-me marker; grounded/structured
  // content is reproduced verbatim.
  return span.provenance === "inferred" ? `${span.text} ${INFERRED_MARKER}` : span.text;
}

export function serializeNote(note: GeneratedNote, opts: SerializeOptions = {}): string {
  const examLines = (opts.examLines ?? []).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];

  out.push("PABAID VISIT NOTE");
  out.push(`Encounter: ${note.encounterId}`);
  out.push(`Generated: ${note.generatedAt} · ${note.model}`);
  if (note.transcriptId) out.push("Grounded in a pasted visit transcript.");
  out.push("");

  for (const heading of SECTION_ORDER) {
    const spans = note.sections.find((s) => s.heading === heading)?.spans ?? [];
    out.push(HEADING_LABEL[heading]);

    for (const span of spans) {
      // A clinician-revised dose must be visible on the plan line itself, not
      // only in the cautions block — the plan is what gets pasted into an EHR.
      const medIdx = heading === "plan" && span.sourceRef?.startsWith("med:")
        ? parseInt(span.sourceRef.slice(4), 10)
        : NaN;
      const decision = Number.isInteger(medIdx) ? opts.doseDecisions?.[medIdx] : undefined;
      out.push(
        decision?.kind === "revised"
          ? `${renderSpan(span)} (dose revised by clinician to "${decision.newDose}")`
          : renderSpan(span),
      );
    }

    if (heading === "objective") {
      if (examLines.length) {
        out.push("Physical exam (entered by clinician):");
        for (const line of examLines) out.push(`- ${line}`);
      } else if (spans.length === 0) {
        out.push("(no exam findings recorded — left blank, not templated)");
      }
    } else if (spans.length === 0) {
      out.push("(none recorded)");
    }

    out.push("");
  }

  const findings = opts.doseFindings ?? [];
  const flaggedIdx = findings
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.status === "exceeds" || f.status === "below_threshold");
  if (flaggedIdx.length) {
    out.push("DOSE CAUTIONS");
    for (const { f, i } of flaggedIdx) {
      const cite = f.citation ? ` [${f.citation.title} — ${f.citation.source}]` : "";
      out.push(`- ${f.message}${cite}`);
      const decision = opts.doseDecisions?.[i];
      if (decision?.kind === "kept") {
        out.push("  Clinician decision: reviewed — kept as documented.");
      } else if (decision?.kind === "revised") {
        const rCite = decision.refreshed.citation
          ? ` [${decision.refreshed.citation.title} — ${decision.refreshed.citation.source}]`
          : "";
        out.push(`  Clinician decision: revised to "${decision.newDose}". ${decision.refreshed.message}${rCite}`);
      } else {
        out.push("  Clinician decision: not yet reviewed.");
      }
    }
    out.push("");
  }

  if (opts.signature) {
    const cred = opts.signature.credential ? `, ${opts.signature.credential}` : "";
    out.push(`Electronically signed by ${opts.signature.clinicianName}${cred} on ${opts.signature.signedAt}.`);
  } else {
    out.push("DRAFT — not signed.");
  }

  // Addenda follow the attestation — the signed content above is untouched.
  for (const addendum of opts.addenda ?? []) {
    out.push("");
    out.push(`ADDENDUM (${addendum.at}):`);
    out.push(addendum.text);
  }

  // Collapse any accidental blank runs, trim, single trailing newline.
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// Stable, filesystem-safe download name, e.g. "visit-note-demo-encounter-1-2026-07-01.txt".
export function noteFilename(note: GeneratedNote): string {
  const stamp = note.generatedAt.slice(0, 10);
  const safe = note.encounterId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `visit-note-${safe}-${stamp}.txt`;
}
