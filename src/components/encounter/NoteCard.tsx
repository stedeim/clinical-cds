"use client";

import { useState } from "react";
import type { GeneratedNote, NoteSpan, NoteSection, NoteHeading, TranscriptSegment } from "@/lib/note/schema";
import type { DoseFinding } from "@/lib/dosecheck/schema";
import { reviseDose, isFlagging, type DoseDecision } from "@/lib/dosecheck/decisions";
import type { Medication } from "@/lib/types";
import { serializeNote, noteFilename, type NoteSignature } from "@/lib/note/export";
import { buildPrintHtml } from "@/lib/note/print";
import { sectionToText, withEditedSection } from "@/lib/note/edit";
import { TranscriptInput, GroundedTranscript } from "@/components/encounter/TranscriptPanel";
import { sectionLabel, CodeChip, SpanText, SectionHeaderRow, SectionEditor } from "@/components/encounter/NoteSections";
import { SummaryCard } from "@/components/encounter/SummaryCard";
import { DoseChip, DoseBanner } from "@/components/encounter/DoseReview";
import type { TranscriptSummaryT } from "@/lib/summary/schema";

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

  // The "cut the fluff" summary. Kept with the segments it cites so hovering a
  // point can show its source lines even after the panel closes.
  const [summary, setSummary] = useState<{ result: TranscriptSummaryT; segments: TranscriptSegment[] } | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // In-place section editing. Edited text becomes `clinician` spans — the
  // doctor's words, no machine provenance, no confirm highlight — and any
  // existing signature is invalidated because the note changed.
  const [editingSection, setEditingSection] = useState<NoteHeading | null>(null);
  const [sectionDraft, setSectionDraft] = useState("");

  function openSectionEditor(heading: NoteHeading) {
    setSectionDraft(sectionToText(note, heading));
    setEditingSection(heading);
  }
  function saveSectionEdit() {
    if (!editingSection) return;
    setNote(withEditedSection(note, editingSection, sectionDraft));
    setEditingSection(null);
    invalidateSignature();
  }

  async function summarize() {
    setSummarizing(true);
    setError(null);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ encounterId, transcriptText: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not summarize the transcript.");
        return;
      }
      setSummary({ result: data.summary, segments: data.transcript ?? [] });
    } catch {
      setError("Network error — please retry.");
    } finally {
      setSummarizing(false);
    }
  }

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

  // Print / Save-as-PDF via the browser's native dialog — no PDF library.
  // The print document is built by a pure, tested function; unsigned notes
  // carry a diagonal DRAFT watermark.
  function printNote() {
    const w = window.open("", "_blank", "width=840,height=1000");
    if (!w) {
      setError("Pop-up blocked — allow pop-ups to print.");
      return;
    }
    w.document.write(buildPrintHtml(note, { examLines, signature, doseFindings, doseDecisions }));
    w.document.close();
    w.focus();
    w.print();
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
    setSummary(null);
    setEditingSection(null);
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
        <TranscriptInput
          text={text}
          onText={setText}
          loading={loading}
          summarizing={summarizing}
          onGround={ground}
          onSummarize={summarize}
          error={error}
        />
      )}

      {grounded && (
        <GroundedTranscript
          segments={segments}
          showSummarize={!summary}
          summarizing={summarizing}
          onSummarize={summarize}
        />
      )}

      {summary && <SummaryCard summary={summary.result} segments={summary.segments} />}

      <SectionHeaderRow label="Subjective" onEdit={() => openSectionEditor("subjective")} />
      {editingSection === "subjective" ? (
        <SectionEditor draft={sectionDraft} onDraft={setSectionDraft} onSave={saveSectionEdit} onCancel={() => setEditingSection(null)} />
      ) : subjective.length === 0 ? (
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

      <SectionHeaderRow label="Assessment" marginTop={18} onEdit={() => openSectionEditor("assessment")} />
      {editingSection === "assessment" ? (
        <SectionEditor draft={sectionDraft} onDraft={setSectionDraft} onSave={saveSectionEdit} onCancel={() => setEditingSection(null)} />
      ) : assessment.length === 0 ? (
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

      <SectionHeaderRow label="Plan" marginTop={18} onEdit={() => openSectionEditor("plan")} />
      {editingSection === "plan" ? (
        <SectionEditor draft={sectionDraft} onDraft={setSectionDraft} onSave={saveSectionEdit} onCancel={() => setEditingSection(null)} />
      ) : plan.length === 0 ? (
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
        <button
          onClick={printNote}
          style={{ font: `600 12px/1 ${T.sans}`, color: T.accent, background: "#fff", border: `1px solid ${T.accentLine}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
        >
          Print / PDF
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
