import type { GeneratedNote } from "./schema";
import type { DoseDecision } from "../dosecheck/decisions";
import type { NoteSignature, SerializeOptions } from "./export";

// Print/PDF view of a finished visit note.
//
// Deliberately a pure HTML-string builder (no PDF library): the browser's
// native print dialog produces the PDF, which is what clinics actually do,
// and a pure function keeps the exact printed content unit-testable. The
// honesty guarantees of the .txt export carry over:
//   • inferred spans keep their visible confirm-me marker;
//   • the exam is the clinician's own words under an explicit subheading,
//     or an honest "left blank" line;
//   • dose cautions print WITH citations and the clinician's decision;
//   • an unsigned note prints with a diagonal DRAFT watermark.
// All user content is HTML-escaped — note text must never become markup.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SECTION_ORDER = ["subjective", "objective", "assessment", "plan"] as const;
const HEADING_LABEL: Record<(typeof SECTION_ORDER)[number], string> = {
  subjective: "Subjective",
  objective: "Objective",
  assessment: "Assessment",
  plan: "Plan",
};

export function buildPrintHtml(note: GeneratedNote, opts: SerializeOptions = {}): string {
  const examLines = (opts.examLines ?? []).map((l) => l.trim()).filter(Boolean);
  const signature: NoteSignature | null = opts.signature ?? null;
  const findings = opts.doseFindings ?? [];
  const decisions = opts.doseDecisions ?? {};

  const sections = SECTION_ORDER.map((heading) => {
    const spans = note.sections.find((s) => s.heading === heading)?.spans ?? [];
    const lines = spans.map((span) => {
      const text = escapeHtml(span.text);
      return span.provenance === "inferred"
        ? `<p>${text} <em class="inferred">[AI-inferred — confirm]</em></p>`
        : `<p>${text}</p>`;
    });

    if (heading === "objective") {
      if (examLines.length) {
        lines.push(`<p class="sub">Physical exam (entered by clinician):</p>`);
        for (const line of examLines) lines.push(`<p>— ${escapeHtml(line)}</p>`);
      } else if (spans.length === 0) {
        lines.push(`<p class="empty">(no exam findings recorded — left blank, not templated)</p>`);
      }
    } else if (lines.length === 0) {
      lines.push(`<p class="empty">(none recorded)</p>`);
    }

    return `<section><h2>${HEADING_LABEL[heading]}</h2>${lines.join("")}</section>`;
  }).join("");

  const flagged = findings
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.status === "exceeds" || f.status === "below_threshold");
  const cautions = flagged.length
    ? `<section class="cautions"><h2>Dose cautions</h2>${flagged
        .map(({ f, i }) => {
          const cite = f.citation ? ` <span class="cite">[${escapeHtml(f.citation.title)} — ${escapeHtml(f.citation.source)}]</span>` : "";
          const d: DoseDecision | undefined = decisions[i];
          const decision =
            d?.kind === "kept"
              ? "Clinician decision: reviewed — kept as documented."
              : d?.kind === "revised"
                ? `Clinician decision: revised to "${escapeHtml(d.newDose)}". ${escapeHtml(d.refreshed.message)}`
                : "Clinician decision: not yet reviewed.";
          return `<p>⚠ ${escapeHtml(f.message)}${cite}<br/><span class="decision">${decision}</span></p>`;
        })
        .join("")}</section>`
    : "";

  const foot = signature
    ? `<p class="signed">Electronically signed by <b>${escapeHtml(signature.clinicianName)}${signature.credential ? ", " + escapeHtml(signature.credential) : ""}</b> on ${escapeHtml(signature.signedAt)}.</p>`
    : `<p class="draftline">DRAFT — not signed.</p>`;
  const addenda = (opts.addenda ?? [])
    .map(
      (a) =>
        `<section class="addendum"><h2>Addendum · ${escapeHtml(a.at)}</h2><p>${escapeHtml(a.text)}</p></section>`,
    )
    .join("");
  const watermark = signature ? "" : `<div class="watermark">DRAFT</div>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Visit note · ${escapeHtml(note.encounterId)}</title>
<style>
  @page { margin: 22mm 18mm; }
  body { font: 12.5pt/1.55 Georgia, "Times New Roman", serif; color: #111; margin: 0; }
  header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 18px; }
  header h1 { font-size: 15pt; margin: 0; letter-spacing: .02em; }
  header p { margin: 3px 0 0; font-size: 9.5pt; color: #444; font-family: ui-monospace, monospace; }
  section { margin-bottom: 14px; }
  h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: .12em; color: #333; border-bottom: 1px solid #999; padding-bottom: 2px; margin: 0 0 6px; }
  p { margin: 0 0 4px; }
  .sub { font-style: italic; color: #333; margin-top: 6px; }
  .empty { color: #666; font-style: italic; }
  .inferred { color: #7a5200; font-size: 10pt; }
  .cautions p { margin-bottom: 8px; }
  .cite, .decision { font-size: 10pt; color: #444; }
  .signed, .draftline { margin-top: 22px; border-top: 1px solid #999; padding-top: 8px; font-size: 10.5pt; }
  .watermark { position: fixed; top: 42%; left: 8%; transform: rotate(-28deg); font: 700 82pt/1 Georgia, serif; color: rgba(120,120,120,.13); letter-spacing: .1em; pointer-events: none; }
</style>
</head>
<body>
${watermark}
<header>
  <h1>Pabaid — Visit Note</h1>
  <p>Encounter ${escapeHtml(note.encounterId)} · generated ${escapeHtml(note.generatedAt)} · ${escapeHtml(note.model)}${note.transcriptId ? " · transcript-grounded" : ""}</p>
</header>
${sections}
${cautions}
${foot}
${addenda}
</body>
</html>`;
}
