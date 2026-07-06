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
import { AllergyAlerts } from "@/components/encounter/AllergyAlerts";
import type { AllergyFindingT } from "@/lib/allergy/engine";
import { sectionLabel, CodeChip, SpanText, SectionHeaderRow, SectionEditor } from "@/components/encounter/NoteSections";
import { SummaryCard } from "@/components/encounter/SummaryCard";
import { DoseChip, DoseBanner } from "@/components/encounter/DoseReview";
import type { TranscriptSummaryT } from "@/lib/summary/schema";
import { T } from "@/lib/ui/tokens";

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

const cardShadow = T.shadow;

export function NoteCard({
  encounterId,
  initialNote,
  doseFindings,
  allergyFindings = [],
  medications,
  clinicianName,
  clinicianCredential,
}: {
  encounterId: string;
  initialNote: GeneratedNote;
  doseFindings: DoseFinding[];
  allergyFindings?: AllergyFindingT[];
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

  // Post-signature amendments. A signed note is never edited — sections lock
  // and changes land as timestamped addenda AFTER the attestation. Addenda do
  // not invalidate the signature: that is their entire purpose.
  const [addenda, setAddenda] = useState<{ text: string; at: string }[]>([]);
  const [addendumOpen, setAddendumOpen] = useState(false);
  const [addendumDraft, setAddendumDraft] = useState("");

  function saveAddendum() {
    const text = addendumDraft.trim();
    if (!text) return;
    setAddenda((prev) => [...prev, { text, at: new Date().toISOString() }]);
    setAddendumDraft("");
    setAddendumOpen(false);
  }

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
    return serializeNote(note, { examLines, signature, doseFindings, doseDecisions, addenda });
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
    w.document.write(buildPrintHtml(note, { examLines, signature, doseFindings, doseDecisions, addenda }));
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
          <div style={{ fontSize: 12, color: T.muted, textAlign: "right" }}>
            {grounded ? `Grounded in ${segments.length} transcript line${segments.length === 1 ? "" : "s"}` : "From chart data"}
            {note.model !== "mock" && <span style={{ color: T.faint }}> · {note.model}</span>}
          </div>
          {!signedAt && (
            <button
              onClick={() => (grounded ? reset() : setOpen((v) => !v))}
              style={{ font: `600 12px/1 ${T.sans}`, color: T.accent, background: T.accentBg, border: `1px solid ${T.accentLine}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
            >
              {grounded ? "Clear transcript" : open ? "Cancel" : "+ Add transcript"}
            </button>
          )}
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

      <SectionHeaderRow label="Subjective" onEdit={signedAt ? undefined : () => openSectionEditor("subjective")} />
      {editingSection === "subjective" ? (
        <SectionEditor draft={sectionDraft} onDraft={setSectionDraft} onSave={saveSectionEdit} onCancel={() => setEditingSection(null)} />
      ) : subjective.length === 0 ? (
        <p style={{ fontSize: 14.5, color: T.faint, margin: 0 }}>No history recorded for this encounter.</p>
      ) : (
        subjective.map((span, i) => (
          <p key={i} style={{ fontSize: 14.5, lineHeight: 1.65, color: T.body, margin: "0 0 4px" }}>
            <SpanText span={span} />
          </p>
        ))
      )}

      <div style={{ ...sectionLabel(), margin: "18px 0 7px" }}>Objective</div>
      {objective.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, font: `500 14px/1.5 ${T.mono}`, color: T.ink, marginBottom: 9 }}>
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
          <div style={{ font: `700 10.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 7 }}>
            Physical exam — your own findings
          </div>
          <textarea
            value={examDraft}
            onChange={(e) => setExamDraft(e.target.value)}
            placeholder={"Lungs clear to auscultation bilaterally.\nNo peripheral edema."}
            rows={4}
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", font: `400 13.5px/1.5 ${T.mono}`, color: T.ink, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 11px" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
            <button
              onClick={saveExam}
              style={{ font: `600 13px/1 ${T.sans}`, color: "#fff", background: T.accent, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
            >
              Save exam
            </button>
            <button
              onClick={() => setExamOpen(false)}
              style={{ font: `600 13px/1 ${T.sans}`, color: T.muted, background: "none", border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
            >
              Cancel
            </button>
            <span style={{ fontSize: 12, color: T.muted, lineHeight: 1.4 }}>
              These are <b style={{ color: T.ink }}>your</b> words, not AI — recorded under your name.
            </span>
          </div>
        </div>
      ) : examLines.length > 0 ? (
        <div style={{ padding: "11px 14px", border: `1px solid ${T.line}`, borderRadius: 12, background: T.panelBg }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ font: `700 10.5px/1 ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted }}>
              Physical exam · entered by you
            </div>
            {!signedAt && (
              <button onClick={openExamEditor} style={{ font: `500 11.5px/1 ${T.sans}`, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                edit
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 14, lineHeight: 1.55, color: T.body }}>
            {examLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "11px 14px", border: `1.5px dashed ${T.accentLine}`, borderRadius: 12, background: T.accentBg2, fontSize: 13.5, color: T.body, lineHeight: 1.5 }}>
          No exam findings were recorded this visit. Pabaid leaves the exam blank rather than inserting a normal template.{" "}
          {!signedAt && (
            <button onClick={openExamEditor} style={{ color: T.accent, fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer", font: `700 13.5px/1.5 ${T.sans}` }}>
              + Add exam
            </button>
          )}
        </div>
      )}

      <SectionHeaderRow label="Assessment" marginTop={18} onEdit={signedAt ? undefined : () => openSectionEditor("assessment")} />
      {editingSection === "assessment" ? (
        <SectionEditor draft={sectionDraft} onDraft={setSectionDraft} onSave={saveSectionEdit} onCancel={() => setEditingSection(null)} />
      ) : assessment.length === 0 ? (
        <div style={{ fontSize: 14.5, color: T.faint }}>No problems listed.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 14.5, color: T.body }}>
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

      <SectionHeaderRow label="Plan" marginTop={18} onEdit={signedAt ? undefined : () => openSectionEditor("plan")} />
      {editingSection === "plan" ? (
        <SectionEditor draft={sectionDraft} onDraft={setSectionDraft} onSave={saveSectionEdit} onCancel={() => setEditingSection(null)} />
      ) : plan.length === 0 ? (
        <div style={{ fontSize: 14.5, color: T.faint }}>No medications on file.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14.5, color: T.body }}>
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

      {/* Allergy conflicts — recorded allergies (this visit AND prior visits)
          against the charted medications. Red = direct/class conflict,
          amber = documented cross-reactivity. */}
      <AllergyAlerts findings={allergyFindings} />

      {/* Addenda — post-signature amendments, each timestamped, rendered and
          exported AFTER the attestation. The signed content stays untouched. */}
      {addenda.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {addenda.map((a, i) => (
            <div key={i} style={{ padding: "10px 13px", background: T.panelBg, border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.accent}`, borderRadius: 10 }}>
              <div style={{ font: `700 10.5px/1 ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.accentInk, marginBottom: 4 }}>
                Addendum · {new Date(a.at).toLocaleString()}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: T.body, whiteSpace: "pre-wrap" }}>{a.text}</div>
            </div>
          ))}
        </div>
      )}
      {addendumOpen && (
        <div style={{ marginTop: 12, padding: "11px 12px", background: T.panelBg, border: `1px solid ${T.line}`, borderRadius: 12 }}>
          <div style={{ font: `700 10.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 7 }}>
            Add addendum — the signed note stays untouched
          </div>
          <textarea
            value={addendumDraft}
            onChange={(e) => setAddendumDraft(e.target.value)}
            rows={3}
            placeholder="e.g. Lab results returned after signing: K+ 4.1, Cr 0.9 — no dose change needed."
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", font: `400 14px/1.55 ${T.sans}`, color: T.ink, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 11px" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={saveAddendum}
              disabled={!addendumDraft.trim()}
              style={{ font: `600 13px/1 ${T.sans}`, color: "#fff", background: addendumDraft.trim() ? T.accent : T.faint, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
            >
              Add addendum
            </button>
            <button
              onClick={() => setAddendumOpen(false)}
              style={{ font: `600 13px/1 ${T.sans}`, color: T.muted, background: "none", border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Finishing flow — ONE hero action (Sign, dark ink per the v2 design),
          quiet secondaries beside it. Signing attests the note and LOCKS it:
          edit affordances disappear and changes become addenda. Unsigning is
          only offered while no addendum exists. */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        {!(signedAt && addenda.length > 0) && (
          <button
            onClick={toggleSign}
            style={
              signedAt
                ? { font: `600 13px/1 ${T.sans}`, color: T.accentInk, background: T.accentBg, border: `1px solid ${T.accentLine}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer" }
                : { font: `700 14.5px/1 ${T.sans}`, color: "#fff", background: T.ink, border: "none", borderRadius: 10, padding: "12px 22px", cursor: "pointer", boxShadow: "0 6px 16px -8px rgba(33,31,25,.55)" }
            }
          >
            {signedAt ? "Signed ✓ — unsign" : "Sign note"}
          </button>
        )}
        {signedAt && !addendumOpen && (
          <button
            onClick={() => setAddendumOpen(true)}
            style={{ font: `600 13px/1 ${T.sans}`, color: T.accent, background: T.accentBg, border: `1px solid ${T.accentLine}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
          >
            + Addendum
          </button>
        )}
        <button
          onClick={copyNote}
          style={{ font: `500 12.5px/1 ${T.sans}`, color: copied ? T.accentInk : T.muted, background: "none", border: "none", borderRadius: 7, padding: "8px 9px", cursor: "pointer" }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          onClick={downloadNote}
          style={{ font: `500 12.5px/1 ${T.sans}`, color: T.muted, background: "none", border: "none", borderRadius: 7, padding: "8px 9px", cursor: "pointer" }}
        >
          .txt
        </button>
        <button
          onClick={printNote}
          style={{ font: `500 12.5px/1 ${T.sans}`, color: T.muted, background: "none", border: "none", borderRadius: 7, padding: "8px 9px", cursor: "pointer" }}
        >
          Print / PDF
        </button>
        <span style={{ fontSize: 12.5, color: T.muted, marginLeft: "auto", textAlign: "right", lineHeight: 1.4 }}>
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
