"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { GeneratedNote, NoteSpan, NoteSection, TranscriptSegment } from "@/lib/note/schema";
import type { DoseFinding } from "@/lib/dosecheck/schema";
import { reviseDose, isFlagging, type DoseDecision } from "@/lib/dosecheck/decisions";
import type { Medication } from "@/lib/types";
import { serializeNote, noteFilename, type NoteSignature } from "@/lib/note/export";
import { Dictation } from "@/components/encounter/Dictation";

// The Visit Note card — a client island so it can re-ground the note against a
// pasted transcript without a full page reload.
//
// Provenance drives every style below (this is the moat):
//   • structured → plain text (a verbatim chart lift)
//   • spoken     → teal underline (grounded in a transcript segment)
//   • inferred   → amber "please confirm" pill (model glue, un-grounded)
// The initial note is server-rendered; "Add transcript" POSTs the pasted text to
// /api/note, which parses it into segments, re-runs generateNote, and returns a
// note whose spoken spans are grounded in those segments.

const T = {
  ink: "#0f2b31",
  body: "#33454a",
  muted: "#7c9096",
  faint: "#a9bbc0",
  line: "#E4E9E8",
  panelBg: "#F6F8F7",
  card: "#ffffff",
  accent: "#0e7490",
  accentInk: "#0b5e73",
  accentBg: "#e2f0f2",
  accentBg2: "#eef6f7",
  accentLine: "#c9e2e6",
  amberInk: "#92400e",
  amberBg: "#fef3c7",
  amberLine: "#fcd34d",
  serif: "'Newsreader',ui-serif,Georgia,serif",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  mono: "'IBM Plex Mono',ui-monospace,monospace",
};
const cardShadow = "0 6px 22px -14px rgba(15,43,49,.32)";

function sectionLabel(): CSSProperties {
  return { font: `700 10.5px/1 ${T.sans}`, letterSpacing: ".12em", textTransform: "uppercase", color: T.accent };
}

function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ font: `600 11px/1 ${T.mono}`, color: T.accentInk, background: T.accentBg, borderRadius: 5, padding: "3px 7px" }}>
      {children}
    </span>
  );
}

function spanStyle(provenance: NoteSpan["provenance"]): CSSProperties {
  if (provenance === "inferred") {
    return { background: T.amberBg, color: T.amberInk, borderRadius: 4, padding: "0 4px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" };
  }
  if (provenance === "spoken") {
    return { boxShadow: `inset 0 -0.6em 0 ${T.accentBg}`, borderBottom: `1.5px solid ${T.accentLine}` };
  }
  return {};
}

function spanTitle(provenance: NoteSpan["provenance"]): string | undefined {
  if (provenance === "inferred") return "Inferred by Pabaid — please confirm against the visit.";
  if (provenance === "spoken") return "Spoken — grounded in the visit transcript.";
  return undefined;
}

function SpanText({ span }: { span: NoteSpan }) {
  return (
    <span style={spanStyle(span.provenance)} title={spanTitle(span.provenance)}>
      {span.text}
    </span>
  );
}

function DoseChip({ finding, decision }: { finding: DoseFinding; decision?: DoseDecision }) {
  // A decided flag must not keep shouting amber: once the clinician has
  // reviewed it (kept, or revised to a within-ceiling dose) the chip goes calm
  // teal. A revision that STILL exceeds the ceiling stays amber — honesty wins.
  const resolved = decision && (decision.kind === "kept" || !isFlagging(decision.refreshed));
  const cite = finding.citation ? ` [${finding.citation.title} — ${finding.citation.source}]` : "";
  return (
    <span
      title={finding.message + cite}
      style={{
        font: `600 10px/1 ${T.sans}`,
        letterSpacing: ".02em",
        color: resolved ? T.accentInk : T.amberInk,
        background: resolved ? T.accentBg : T.amberBg,
        border: `1px solid ${resolved ? T.accentLine : T.amberLine}`,
        borderRadius: 6,
        padding: "3px 7px",
        cursor: "help",
        whiteSpace: "nowrap",
      }}
    >
      {resolved ? "✓ dose reviewed" : "⚠ dose"}
    </span>
  );
}

// The accept/reject flow for a flagged dose. Two clinician actions, never a
// suggested dose (the engine doesn't guess — a "Use 20 mg" button would be the
// app prescribing, outside Non-Device CDS):
//   • Revise dose… — the clinician types the corrected dose; the check re-runs
//     against it and the banner clears only if it's genuinely within ceiling.
//   • Keep as documented — acknowledged; recorded as their decision on export.
function DoseBanner({
  finding,
  decision,
  onDecide,
  onRevise,
}: {
  finding: DoseFinding;
  decision?: DoseDecision;
  onDecide: (d: DoseDecision | undefined) => void;
  onRevise: (newDose: string) => Promise<DoseFinding>;
}) {
  const [reviseOpen, setReviseOpen] = useState(false);
  const [doseDraft, setDoseDraft] = useState("");
  const [checking, setChecking] = useState(false);

  async function saveRevision() {
    const newDose = doseDraft.trim();
    if (!newDose) return;
    setChecking(true);
    try {
      const refreshed = await onRevise(newDose);
      onDecide({ kind: "revised", newDose, refreshed });
      setReviseOpen(false);
      setDoseDraft("");
    } finally {
      setChecking(false);
    }
  }

  const cite = finding.citation ? `${finding.citation.title} — ${finding.citation.source}` : null;

  if (decision) {
    const stillFlagged = decision.kind === "revised" && isFlagging(decision.refreshed);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          padding: "9px 12px",
          background: stillFlagged ? T.amberBg : T.accentBg2,
          border: `1px solid ${stillFlagged ? T.amberLine : T.accentLine}`,
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.5,
          color: stillFlagged ? T.amberInk : T.body,
        }}
      >
        <span style={{ fontWeight: 700, color: stillFlagged ? T.amberInk : T.accentInk }}>{stillFlagged ? "⚠" : "✓"}</span>
        <span style={{ flex: 1 }}>
          {decision.kind === "kept" ? (
            <>Reviewed — <b>kept as documented</b>.</>
          ) : (
            <>Revised to <b>&ldquo;{decision.newDose}&rdquo;</b> by you. {decision.refreshed.message}</>
          )}
        </span>
        <button
          onClick={() => onDecide(undefined)}
          style={{ font: `500 10.5px/1 ${T.sans}`, color: stillFlagged ? T.amberInk : T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          undo
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "11px 13px", background: T.amberBg, border: `1px solid ${T.amberLine}`, borderRadius: 10 }}>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <span style={{ color: T.amberInk, fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>⚠</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: T.amberInk, fontSize: 12.5 }}>Dose check · {finding.medication}</div>
          <div style={{ fontSize: 12, color: T.amberInk, lineHeight: 1.5, marginTop: 2 }}>{finding.message}</div>
          {cite && <div style={{ fontSize: 10.5, color: T.amberInk, opacity: 0.75, marginTop: 3 }}>{cite}</div>}
          {reviseOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
              <input
                value={doseDraft}
                onChange={(e) => setDoseDraft(e.target.value)}
                placeholder="e.g. 20 mg"
                style={{ font: `400 12.5px/1.5 ${T.mono}`, color: T.ink, background: "#fff", border: `1px solid ${T.amberLine}`, borderRadius: 8, padding: "7px 10px", width: 110 }}
              />
              <button
                onClick={saveRevision}
                disabled={checking || doseDraft.trim().length === 0}
                style={{ font: `600 12px/1 ${T.sans}`, color: "#fff", background: doseDraft.trim() ? T.accent : T.faint, border: "none", borderRadius: 8, padding: "8px 13px", cursor: doseDraft.trim() && !checking ? "pointer" : "default" }}
              >
                {checking ? "Checking…" : "Save & re-check"}
              </button>
              <button
                onClick={() => setReviseOpen(false)}
                style={{ font: `600 12px/1 ${T.sans}`, color: T.amberInk, background: "none", border: `1px solid ${T.amberLine}`, borderRadius: 8, padding: "8px 11px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <span style={{ fontSize: 10.5, color: T.amberInk, opacity: 0.8 }}>Your dose, your words — re-checked against the same reference.</span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <button
                onClick={() => setReviseOpen(true)}
                style={{ font: `600 12px/1 ${T.sans}`, color: "#fff", background: T.accent, border: "none", borderRadius: 8, padding: "8px 13px", cursor: "pointer" }}
              >
                Revise dose…
              </button>
              <button
                onClick={() => onDecide({ kind: "kept" })}
                style={{ font: `600 12px/1 ${T.sans}`, color: T.amberInk, background: "none", border: `1px solid ${T.amberLine}`, borderRadius: 8, padding: "8px 13px", cursor: "pointer" }}
              >
                Keep as documented
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DEMO_TRANSCRIPT = [
  "PT: The cough started about five days ago, mostly at night.",
  "PT: No fever that I've noticed, but I get winded on the stairs now.",
  "DR: Any chest pain or coughing up blood?",
  "PT: No blood. A little tightness, not really pain.",
].join("\n");

export function NoteCard({
  encounterId,
  initialNote,
  doseFindings,
  medications,
  clinicianName,
  clinicianCredential,
}: {
  encounterId: string;
  initialNote: GeneratedNote;
  doseFindings: DoseFinding[];
  medications: Medication[];
  clinicianName?: string;
  clinicianCredential?: string;
}) {
  const [note, setNote] = useState<GeneratedNote>(initialNote);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Finishing flow (all client-side; no persistence until the DB lands).
  const [examText, setExamText] = useState(""); // clinician-authored exam findings
  const [examOpen, setExamOpen] = useState(false);
  const [examDraft, setExamDraft] = useState("");
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Clinician decisions on flagged dose findings, keyed by finding index.
  // A decision changes the exported note, so it invalidates any signature.
  const [doseDecisions, setDoseDecisions] = useState<Record<number, DoseDecision>>({});
  function decideDose(idx: number, d: DoseDecision | undefined) {
    setDoseDecisions((prev) => {
      const next = { ...prev };
      if (d) next[idx] = d;
      else delete next[idx];
      return next;
    });
    invalidateSignature();
  }

  const examLines = examText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Re-grounding or clearing the transcript changes the note; a signature made
  // against the old text is no longer valid, so drop it.
  function invalidateSignature() {
    setSignedAt(null);
  }

  const signature: NoteSignature | null = signedAt
    ? { clinicianName: clinicianName ?? "Clinician", credential: clinicianCredential, signedAt }
    : null;

  function buildExportText(): string {
    return serializeNote(note, { examLines, signature, doseFindings, doseDecisions });
  }

  async function copyNote() {
    try {
      await navigator.clipboard.writeText(buildExportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy to clipboard.");
    }
  }

  function downloadNote() {
    const blob = new Blob([buildExportText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = noteFilename(note);
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSign() {
    setSignedAt((prev) => (prev ? null : new Date().toISOString()));
  }

  function openExamEditor() {
    setExamDraft(examText);
    setExamOpen(true);
  }
  function saveExam() {
    setExamText(examDraft);
    setExamOpen(false);
    invalidateSignature();
  }

  const spansOf = (heading: NoteSection["heading"]): NoteSpan[] =>
    note.sections.find((s) => s.heading === heading)?.spans ?? [];
  const subjective = spansOf("subjective");
  const objective = spansOf("objective");
  const assessment = spansOf("assessment");
  const plan = spansOf("plan");

  const findingForSpan = (span: NoteSpan): DoseFinding | undefined => {
    const idx = span.sourceRef ? parseInt(span.sourceRef.split(":")[1] ?? "", 10) : NaN;
    return Number.isInteger(idx) ? doseFindings[idx] : undefined;
  };

  async function ground() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ encounterId, transcriptText: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not ground the note.");
        return;
      }
      setNote(data.note);
      setSegments(data.transcript ?? []);
      setOpen(false);
      invalidateSignature();
    } catch {
      setError("Network error — please retry.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setNote(initialNote);
    setSegments([]);
    setText("");
    setError(null);
    invalidateSignature();
  }

  const grounded = segments.length > 0;

  return (
    <div style={{ background: T.card, borderRadius: 16, padding: "20px 22px", boxShadow: cardShadow }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: `1px solid ${T.line}`, paddingBottom: 11, marginBottom: 16, gap: 10 }}>
        <div style={{ font: `600 18px/1 ${T.serif}`, color: T.ink }}>Visit Note</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: T.muted, textAlign: "right" }}>
            {grounded ? `Grounded in ${segments.length} transcript line${segments.length === 1 ? "" : "s"}` : "From chart data"}
            {note.model !== "mock" && <span style={{ color: T.faint }}> · {note.model}</span>}
          </div>
          <button
            onClick={() => (grounded ? reset() : setOpen((v) => !v))}
            style={{ font: `600 11px/1 ${T.sans}`, color: T.accent, background: T.accentBg, border: `1px solid ${T.accentLine}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
          >
            {grounded ? "Clear transcript" : open ? "Cancel" : "+ Add transcript"}
          </button>
        </div>
      </div>

      {open && !grounded && (
        <div style={{ marginBottom: 16, padding: "12px 13px", background: T.panelBg, border: `1px solid ${T.line}`, borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
            <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted }}>Dictate or paste visit transcript</div>
            <button onClick={() => setText(DEMO_TRANSCRIPT)} style={{ font: `500 10.5px/1 ${T.sans}`, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              use sample
            </button>
          </div>
          {/* Voice dictation appends finalized DR:/PT: lines to the same textarea
              the paste flow uses — one pipeline into the grounding engine. */}
          <Dictation onSegment={(line) => setText((prev) => (prev ? prev.replace(/\n?$/, "\n") : "") + line)} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"DR: What brings you in today?\nPT: I've had a cough for about a week..."}
            rows={5}
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", font: `400 12.5px/1.5 ${T.mono}`, color: T.ink, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 11px" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
            <button
              onClick={ground}
              disabled={loading || text.trim().length === 0}
              style={{ font: `600 12px/1 ${T.sans}`, color: "#fff", background: text.trim() ? T.accent : T.faint, border: "none", borderRadius: 8, padding: "8px 14px", cursor: text.trim() && !loading ? "pointer" : "default" }}
            >
              {loading ? "Grounding…" : "Ground note"}
            </button>
            <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>
              Only these text lines reach Pabaid — audio never does. Lines become <b style={{ color: T.accentInk }}>spoken</b> spans in the note.
            </span>
          </div>
          {error && <div style={{ marginTop: 8, fontSize: 11.5, color: T.amberInk }}>{error}</div>}
        </div>
      )}

      {grounded && (
        <div style={{ marginBottom: 16, padding: "11px 13px", background: T.accentBg2, border: `1px solid ${T.accentLine}`, borderRadius: 12 }}>
          <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.accentInk, marginBottom: 8 }}>Transcript</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {segments.map((seg) => (
              <div key={seg.id} style={{ fontSize: 12, lineHeight: 1.45, color: T.body }}>
                <span style={{ font: `600 10px/1 ${T.sans}`, textTransform: "uppercase", letterSpacing: ".05em", color: seg.speaker === "patient" ? T.accent : T.muted, marginRight: 6 }}>
                  {seg.speaker === "clinician" ? "Dr" : seg.speaker === "patient" ? "Pt" : "—"}
                </span>
                {seg.text}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...sectionLabel(), marginBottom: 7 }}>Subjective</div>
      {subjective.length === 0 ? (
        <p style={{ fontSize: 13.5, color: T.faint, margin: 0 }}>No history recorded for this encounter.</p>
      ) : (
        subjective.map((span, i) => (
          <p key={i} style={{ fontSize: 13.5, lineHeight: 1.65, color: T.body, margin: "0 0 4px" }}>
            <SpanText span={span} />
          </p>
        ))
      )}

      <div style={{ ...sectionLabel(), margin: "18px 0 7px" }}>Objective</div>
      {objective.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, font: `500 13px/1.5 ${T.mono}`, color: T.ink, marginBottom: 9 }}>
          {objective.map((span, i) => (
            <div key={i}>
              <SpanText span={span} />
            </div>
          ))}
        </div>
      )}
      {/* The physical exam is the clinician's OWN work — never templated. It is
          kept separate from AI content and clearly labelled "entered by you". */}
      {examOpen ? (
        <div style={{ padding: "12px 13px", background: T.panelBg, border: `1px solid ${T.line}`, borderRadius: 12 }}>
          <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 7 }}>
            Physical exam — your own findings
          </div>
          <textarea
            value={examDraft}
            onChange={(e) => setExamDraft(e.target.value)}
            placeholder={"Lungs clear to auscultation bilaterally.\nNo peripheral edema."}
            rows={4}
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", font: `400 12.5px/1.5 ${T.mono}`, color: T.ink, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 11px" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
            <button
              onClick={saveExam}
              style={{ font: `600 12px/1 ${T.sans}`, color: "#fff", background: T.accent, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
            >
              Save exam
            </button>
            <button
              onClick={() => setExamOpen(false)}
              style={{ font: `600 12px/1 ${T.sans}`, color: T.muted, background: "none", border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
            >
              Cancel
            </button>
            <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>
              These are <b style={{ color: T.ink }}>your</b> words, not AI — recorded under your name.
            </span>
          </div>
        </div>
      ) : examLines.length > 0 ? (
        <div style={{ padding: "11px 14px", border: `1px solid ${T.line}`, borderRadius: 12, background: T.panelBg }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted }}>
              Physical exam · entered by you
            </div>
            <button onClick={openExamEditor} style={{ font: `500 10.5px/1 ${T.sans}`, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              edit
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 13, lineHeight: 1.55, color: T.body }}>
            {examLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "11px 14px", border: `1.5px dashed ${T.accentLine}`, borderRadius: 12, background: T.accentBg2, fontSize: 12.5, color: T.body, lineHeight: 1.5 }}>
          No exam findings were recorded this visit. Pabaid leaves the exam blank rather than inserting a normal template.{" "}
          <button onClick={openExamEditor} style={{ color: T.accent, fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer", font: `700 12.5px/1.5 ${T.sans}` }}>
            + Add exam
          </button>
        </div>
      )}

      <div style={{ ...sectionLabel(), margin: "18px 0 7px" }}>Assessment</div>
      {assessment.length === 0 ? (
        <div style={{ fontSize: 13.5, color: T.faint }}>No problems listed.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13.5, color: T.body }}>
          {assessment.map((span, i) => {
            const m = span.text.match(/^(.*?)\s*\(([A-Za-z0-9.]+)\)\s*$/);
            const label = m ? m[1] : span.text;
            const code = m ? m[2] : null;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <SpanText span={{ ...span, text: label }} />
                {code && <CodeChip>{code}</CodeChip>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ ...sectionLabel(), margin: "18px 0 7px" }}>Plan</div>
      {plan.length === 0 ? (
        <div style={{ fontSize: 13.5, color: T.faint }}>No medications on file.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: T.body }}>
          {plan.map((span, i) => {
            const [first, ...rest] = span.text.split(" ");
            const finding = findingForSpan(span);
            const flagged = finding && isFlagging(finding);
            const idx = finding ? doseFindings.indexOf(finding) : -1;
            const decision = idx >= 0 ? doseDecisions[idx] : undefined;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>
                  <b style={{ color: T.ink, fontWeight: 600 }}>{first}</b>
                  {rest.length ? " " + rest.join(" ") : ""}
                  {decision?.kind === "revised" && (
                    <span style={{ color: T.accentInk, fontWeight: 600 }}> → {decision.newDose} (revised by you)</span>
                  )}
                </span>
                {flagged && finding && <DoseChip finding={finding} decision={decision} />}
              </div>
            );
          })}
        </div>
      )}
      {/* Flagged doses each get an actionable caution banner: the clinician
          either revises the dose (their words, re-checked) or keeps it. */}
      {doseFindings.some((f, i) => isFlagging(f) && medications[i]) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {doseFindings.map((finding, i) =>
            isFlagging(finding) && medications[i] ? (
              <DoseBanner
                key={i}
                finding={finding}
                decision={doseDecisions[i]}
                onDecide={(d) => decideDose(i, d)}
                onRevise={(newDose) => reviseDose(medications[i], newDose)}
              />
            ) : null,
          )}
        </div>
      )}

      {/* Finishing flow — sign / copy / download. Signing attests the note under
          the clinician's name; any later edit (re-ground, clear, exam change)
          invalidates the signature and reverts the note to DRAFT. */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <button
          onClick={toggleSign}
          style={{ font: `600 12px/1 ${T.sans}`, color: signedAt ? T.accentInk : "#fff", background: signedAt ? T.accentBg : T.accent, border: signedAt ? `1px solid ${T.accentLine}` : "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
        >
          {signedAt ? "Signed ✓ — unsign" : "Sign note"}
        </button>
        <button
          onClick={copyNote}
          style={{ font: `600 12px/1 ${T.sans}`, color: T.accent, background: "#fff", border: `1px solid ${T.accentLine}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          onClick={downloadNote}
          style={{ font: `600 12px/1 ${T.sans}`, color: T.accent, background: "#fff", border: `1px solid ${T.accentLine}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
        >
          Download .txt
        </button>
        <span style={{ fontSize: 11.5, color: T.muted, marginLeft: "auto", textAlign: "right", lineHeight: 1.4 }}>
          {signedAt ? (
            <>
              Electronically signed by <b style={{ color: T.ink }}>{clinicianName ?? "Clinician"}{clinicianCredential ? `, ${clinicianCredential}` : ""}</b>
              <br />
              {new Date(signedAt).toLocaleString()}
            </>
          ) : (
            <>Draft — not signed. Exported copies are watermarked <b style={{ color: T.ink }}>DRAFT</b>.</>
          )}
        </span>
      </div>
    </div>
  );
}
