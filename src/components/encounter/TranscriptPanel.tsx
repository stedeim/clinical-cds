"use client";

import type { TranscriptSegment } from "@/lib/note/schema";
import { Dictation } from "@/components/encounter/Dictation";
import { T } from "@/lib/ui/tokens";

// The transcript panel — dictate/paste input before grounding, and the
// grounded segment list after. Extracted from NoteCard; all state stays in
// NoteCard (the note, export, and signature flows depend on it).

const DEMO_TRANSCRIPT = [
  "PT: The cough started about five days ago, mostly at night.",
  "PT: No fever that I've noticed, but I get winded on the stairs now.",
  "DR: Any chest pain or coughing up blood?",
  "PT: No blood. A little tightness, not really pain.",
].join("\n");

export function TranscriptInput({
  text,
  onText,
  loading,
  summarizing,
  onGround,
  onSummarize,
  error,
}: {
  text: string;
  onText: (v: string) => void;
  loading: boolean;
  summarizing: boolean;
  onGround: () => void;
  onSummarize: () => void;
  error: string | null;
}) {
  return (
    <div style={{ marginBottom: 16, padding: "12px 13px", background: T.panelBg, border: `1px solid ${T.line}`, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
        <div style={{ font: `700 10.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted }}>Dictate or paste visit transcript</div>
        <button onClick={() => onText(DEMO_TRANSCRIPT)} style={{ font: `500 11.5px/1 ${T.sans}`, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          use sample
        </button>
      </div>
      {/* Voice dictation appends finalized DR:/PT: lines to the same textarea
          the paste flow uses — one pipeline into the grounding engine. */}
      <Dictation onSegment={(line) => onText((text ? text.replace(/\n?$/, "\n") : "") + line)} />
      <textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={"DR: What brings you in today?\nPT: I've had a cough for about a week..."}
        rows={5}
        style={{ width: "100%", boxSizing: "border-box", resize: "vertical", font: `400 13.5px/1.5 ${T.mono}`, color: T.ink, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 11px" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9, flexWrap: "wrap" }}>
        <button
          onClick={onGround}
          disabled={loading || text.trim().length === 0}
          style={{ font: `600 13px/1 ${T.sans}`, color: "#fff", background: text.trim() ? T.accent : T.faint, border: "none", borderRadius: 8, padding: "8px 14px", cursor: text.trim() && !loading ? "pointer" : "default" }}
        >
          {loading ? "Grounding…" : "Ground note"}
        </button>
        <button
          onClick={onSummarize}
          disabled={summarizing || text.trim().length < 20}
          style={{ font: `600 13px/1 ${T.sans}`, color: T.accent, background: T.accentBg, border: `1px solid ${T.accentLine}`, borderRadius: 8, padding: "8px 12px", cursor: text.trim().length >= 20 && !summarizing ? "pointer" : "default", opacity: text.trim().length >= 20 ? 1 : 0.5 }}
        >
          {summarizing ? "Summarizing…" : "Summarize"}
        </button>
        <span style={{ fontSize: 12, color: T.muted, lineHeight: 1.4 }}>
          Only these text lines reach Pabaid — audio never does. Lines become <b style={{ color: T.accentInk }}>spoken</b> spans in the note.
        </span>
      </div>
      {error && <div style={{ marginTop: 8, fontSize: 12.5, color: T.amberInk }}>{error}</div>}
    </div>
  );
}

export function GroundedTranscript({
  segments,
  showSummarize,
  summarizing,
  onSummarize,
}: {
  segments: TranscriptSegment[];
  showSummarize: boolean;
  summarizing: boolean;
  onSummarize: () => void;
}) {
  return (
    <div style={{ marginBottom: 16, padding: "11px 13px", background: T.accentBg2, border: `1px solid ${T.accentLine}`, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ font: `700 10.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.accentInk }}>Transcript</div>
        {showSummarize && (
          <button
            onClick={onSummarize}
            disabled={summarizing}
            style={{ font: `600 11.5px/1 ${T.sans}`, color: T.accent, background: "#fff", border: `1px solid ${T.accentLine}`, borderRadius: 7, padding: "5px 9px", cursor: "pointer" }}
          >
            {summarizing ? "Summarizing…" : "Summarize — skip the fluff"}
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {segments.map((seg) => (
          <div key={seg.id} style={{ fontSize: 13, lineHeight: 1.45, color: T.body }}>
            <span style={{ font: `600 11px/1 ${T.sans}`, textTransform: "uppercase", letterSpacing: ".05em", color: seg.speaker === "patient" ? T.accent : T.muted, marginRight: 6 }}>
              {seg.speaker === "clinician" ? "Dr" : seg.speaker === "patient" ? "Pt" : "—"}
            </span>
            {seg.text}
          </div>
        ))}
      </div>
    </div>
  );
}
