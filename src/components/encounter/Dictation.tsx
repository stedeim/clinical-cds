"use client";

import { useEffect, useRef, useState } from "react";
import { inferSpeaker, type InferredSpeaker } from "@/lib/note/speaker-infer";

// In-encounter dictation via the browser's Web Speech API.
//
// Honesty and consent, in that order:
//   • CONSENT GATE — recording a doctor–patient conversation has legal consent
//     requirements (two-party consent in several US states and most contexts).
//     The mic cannot start until the clinician confirms the patient agreed.
//   • DEMO GRADE — Chrome's speech engine processes audio via the browser
//     vendor's service. That is fine for demos and fake data, NOT for real
//     patient conversations; the label says so plainly. A BAA-covered STT
//     provider (with speaker diarization) replaces this engine later — the
//     output contract (DR:/PT:-prefixed transcript lines) stays the same.
//   • The clinician tags who is speaking with the DR/PT toggle; each finalized
//     phrase lands as a "DR: …" / "PT: …" line feeding the existing
//     transcript-grounding pipeline. No new backend — speech never leaves the
//     page except through the browser's own engine.

const T = {
  ink: "#0f2b31",
  body: "#33454a",
  muted: "#7c9096",
  faint: "#a9bbc0",
  line: "#E4E9E8",
  accent: "#0e7490",
  accentInk: "#0b5e73",
  accentBg: "#e2f0f2",
  accentLine: "#c9e2e6",
  rec: "#c1502a",
  recBg: "#fdeee7",
  amberInk: "#92400e",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  mono: "'IBM Plex Mono',ui-monospace,monospace",
};

export function Dictation({ onSegment }: { onSegment: (line: string) => void }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [consented, setConsented] = useState(false);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Refs so the recognition callbacks always see current values without
  // re-creating the recognition object on every render.
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingRef = useRef(false);
  // Last inferred speaker — feeds the alternation prior in inferSpeaker.
  const lastSpeakerRef = useRef<InferredSpeaker | null>(null);
  const [lastSpeaker, setLastSpeaker] = useState<InferredSpeaker | null>(null);

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    return () => {
      recordingRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  function start() {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    setError(null);

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";

    rec.onresult = (ev) => {
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) {
          // Speaker inferred from what was said (no manual toggle) — the
          // DR:/PT: prefix lands in the editable transcript, correctable.
          const speaker = inferSpeaker(text, lastSpeakerRef.current);
          lastSpeakerRef.current = speaker;
          setLastSpeaker(speaker);
          onSegment(`${speaker}: ${text}`);
        } else {
          interimText += text + " ";
        }
      }
      setInterim(interimText.trim());
    };

    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        setError("Microphone access was blocked. Allow the mic for this site and try again.");
        recordingRef.current = false;
        setRecording(false);
      }
      // "no-speech"/"aborted" are routine; onend handles restart.
    };

    // Chrome ends recognition after silence; restart while still recording.
    rec.onend = () => {
      setInterim("");
      if (recordingRef.current) {
        try {
          rec.start();
        } catch {
          recordingRef.current = false;
          setRecording(false);
        }
      }
    };

    recognitionRef.current = rec;
    recordingRef.current = true;
    setRecording(true);
    rec.start();
  }

  function stop() {
    recordingRef.current = false;
    setRecording(false);
    setInterim("");
    recognitionRef.current?.stop();
  }

  if (supported === null) return null;

  if (!supported) {
    return (
      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 8 }}>
        Voice dictation isn&rsquo;t available in this browser (try Chrome). You can still paste or type the transcript below.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 9 }}>
      {!consented ? (
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11.5, color: T.body, lineHeight: 1.5, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>
            The patient has <b style={{ color: T.ink }}>consented to this conversation being recorded</b>. Required before the mic can start.
          </span>
        </label>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <button
            onClick={recording ? stop : start}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              font: `600 12px/1 ${T.sans}`,
              color: recording ? T.rec : "#fff",
              background: recording ? T.recBg : T.accent,
              border: recording ? `1px solid ${T.rec}` : "none",
              borderRadius: 8,
              padding: "8px 13px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: recording ? 2 : "50%",
                background: recording ? T.rec : "#fff",
                display: "inline-block",
              }}
            />
            {recording ? "Stop dictation" : "Start dictation"}
          </button>

          {recording && lastSpeaker && (
            <span
              title="Speaker inferred from what was said — edit the DR:/PT: prefix below if it guessed wrong."
              style={{ font: `600 11px/1 ${T.mono}`, color: T.accentInk, background: T.accentBg, border: `1px solid ${T.accentLine}`, borderRadius: 6, padding: "6px 10px", cursor: "help" }}
            >
              last: {lastSpeaker === "DR" ? "Doctor" : "Patient"}
            </span>
          )}

          {recording && (
            <span style={{ fontSize: 11.5, color: interim ? T.body : T.faint, fontStyle: interim ? "normal" : "italic", flex: 1, minWidth: 120 }}>
              {interim || "listening…"}
            </span>
          )}
        </div>
      )}

      <div style={{ marginTop: 6, fontSize: 10, color: T.faint, lineHeight: 1.45 }}>
        Speaker labels (DR/PT) are inferred from what&rsquo;s said — fix any wrong prefix right in the text below. Demo dictation — uses the browser&rsquo;s speech engine (audio may be processed by the browser vendor). Not for real patient conversations until a BAA-covered transcription provider is connected.
      </div>
      {error && <div style={{ marginTop: 6, fontSize: 11, color: T.amberInk }}>{error}</div>}
    </div>
  );
}
