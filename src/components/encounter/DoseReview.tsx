"use client";

import { useState } from "react";
import type { DoseFinding } from "@/lib/dosecheck/schema";
import { isFlagging, type DoseDecision } from "@/lib/dosecheck/decisions";
import { T } from "@/lib/ui/tokens";

// Dose-review UI: the inline chip on a plan line and the actionable caution
// banner (Revise dose… / Keep as documented). Extracted from NoteCard.
// The regulatory shape is unchanged: never a suggested dose — the clinician
// types the revision and the same offline check re-runs against it.

export function DoseChip({ finding, decision }: { finding: DoseFinding; decision?: DoseDecision }) {
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
export function DoseBanner({
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
