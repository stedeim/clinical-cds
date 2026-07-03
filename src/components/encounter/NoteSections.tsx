"use client";

import type { CSSProperties } from "react";
import type { NoteSpan } from "@/lib/note/schema";

// Note-section presentation primitives, extracted from NoteCard:
// provenance-driven span styling (the moat's visual layer), section headers
// with the in-place edit affordance, and the section plain-text editor.

const T = {
  ink: "#0f2b31",
  muted: "#7c9096",
  line: "#E4E9E8",
  panelBg: "#F6F8F7",
  accent: "#0e7490",
  accentInk: "#0b5e73",
  accentBg: "#e2f0f2",
  accentLine: "#c9e2e6",
  amberInk: "#92400e",
  amberBg: "#fef3c7",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  mono: "'IBM Plex Mono',ui-monospace,monospace",
};

export function sectionLabel(): CSSProperties {
  return { font: `700 10.5px/1 ${T.sans}`, letterSpacing: ".12em", textTransform: "uppercase", color: T.accent };
}

export function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ font: `600 11px/1 ${T.mono}`, color: T.accentInk, background: T.accentBg, borderRadius: 5, padding: "3px 7px" }}>
      {children}
    </span>
  );
}

// Provenance drives the styling (this is the moat's visual layer):
//   structured → plain · spoken → teal underline · inferred → amber confirm
//   pill · clinician → plain, titled "Written by you."
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
  if (provenance === "clinician") return "Written by you.";
  return undefined;
}

export function SpanText({ span }: { span: NoteSpan }) {
  return (
    <span style={spanStyle(span.provenance)} title={spanTitle(span.provenance)}>
      {span.text}
    </span>
  );
}

// Section header with the in-place edit affordance.
export function SectionHeaderRow({
  label,
  marginTop,
  onEdit,
}: {
  label: string;
  marginTop?: number;
  onEdit?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: `${marginTop ?? 0}px 0 7px` }}>
      <div style={sectionLabel()}>{label}</div>
      {onEdit && (
        <button
          onClick={onEdit}
          style={{ font: `500 10.5px/1 ${T.sans}`, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          edit
        </button>
      )}
    </div>
  );
}

// Plain-text editor for one section. Saving replaces the section's spans with
// clinician-authored lines.
export function SectionEditor({
  draft,
  onDraft,
  onSave,
  onCancel,
}: {
  draft: string;
  onDraft: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ padding: "11px 12px", background: T.panelBg, border: `1px solid ${T.line}`, borderRadius: 12 }}>
      <textarea
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        rows={Math.min(10, Math.max(3, draft.split("\n").length + 1))}
        style={{ width: "100%", boxSizing: "border-box", resize: "vertical", font: `400 13px/1.55 ${T.sans}`, color: T.ink, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 11px" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <button
          onClick={onSave}
          style={{ font: `600 12px/1 ${T.sans}`, color: "#fff", background: T.accent, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{ font: `600 12px/1 ${T.sans}`, color: T.muted, background: "none", border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
        >
          Cancel
        </button>
        <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>
          Edited text becomes <b style={{ color: T.ink }}>your</b> words — provenance highlights are replaced by your authorship.
        </span>
      </div>
    </div>
  );
}
