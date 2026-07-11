"use client";

import { useEffect, useRef, useState } from "react";
import { inferSpeaker, type InferredSpeaker } from "@/lib/note/speaker-infer";
import { T } from "@/lib/ui/tokens";

// In-encounter dictation. Two engines, one output contract (DR:/PT: lines):
//
//   • DEEPGRAM (when the server has a key and the caller enables it): the
//     browser records audio; on stop it's transcribed by a medical speech
//     model with real speaker diarization — voices are separated by sound,
//     then named DR/PT by the text heuristic voting across each voice.
//   • BROWSER FALLBACK: the Web Speech API with live interim text and
//     per-line speaker inference. Always available; used when Deepgram is
//     unconfigured, unsupported, or fails.
//
// Honesty and consent, in that order:
//   • CONSENT GATE — recording a doctor–patient conversation has legal
//     consent requirements. Neither engine starts until the clinician
//     confirms the patient agreed.
//   • The label under the mic says exactly which engine is doing the work
//     and what that means for real patients (BAA still pending).

export function Dictation({
  onSegment,
  deepgramEnabled = false,
}: {
  onSegment: (line: string) => void;
  deepgramEnabled?: boolean;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [canRecordAudio, setCanRecordAudio] = useState(false);
  const [consented, setConsented] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpeakerRef = useRef<InferredSpeaker | null>(null);
  const [lastSpeaker, setLastSpeaker] = useState<InferredSpeaker | null>(null);

  const useDeepgram = deepgramEnabled && canRecordAudio;

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    setCanRecordAudio(
      typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    );
    return () => {
      recordingRef.current = false;
      recognitionRef.current?.abort();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ---- Deepgram path: record → stop → transcribe ------------------------
  async function startDeepgram() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked. Allow the mic for this site and try again.");
      return;
    }
    chunksRef.current = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      chunksRef.current = [];
      if (blob.size === 0) return;

      setTranscribing(true);
      try {
        const form = new FormData();
        form.append("audio", blob, "dictation.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Transcription failed.");
        // One append with the whole diarized block.
        onSegment(data.transcriptText);
      } catch (e) {
        setError(
          (e instanceof Error ? e.message : "Transcription failed.") +
            " You can retry, or type the transcript below.",
        );
      } finally {
        setTranscribing(false);
      }
    };
    mediaRecorderRef.current = rec;
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setRecording(true);
    rec.start();
  }

  function stopDeepgram() {
    setRecording(false);
    mediaRecorderRef.current?.stop();
  }

  // ---- Browser fallback path (unchanged behavior) -----------------------
  function startBrowser() {
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
    };

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

  function stopBrowser() {
    recordingRef.current = false;
    setRecording(false);
    setInterim("");
    recognitionRef.current?.stop();
  }

  if (supported === null) return null;

  if (!supported && !useDeepgram) {
    return (
      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 8 }}>
        Voice dictation isn&rsquo;t available in this browser (try Chrome). You can still paste or type the transcript below.
      </div>
    );
  }

  const start = useDeepgram ? startDeepgram : startBrowser;
  const stop = useDeepgram ? stopDeepgram : stopBrowser;
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div style={{ marginBottom: 9 }}>
      {!consented ? (
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: T.body, lineHeight: 1.5, cursor: "pointer" }}>
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
            disabled={transcribing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              font: `600 13px/1 ${T.sans}`,
              color: recording ? T.rec : "#fff",
              background: recording ? T.recBg : transcribing ? T.faint : T.accent,
              border: recording ? `1px solid ${T.rec}` : "none",
              borderRadius: 8,
              padding: "8px 13px",
              cursor: transcribing ? "default" : "pointer",
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

          {recording && useDeepgram && (
            <span style={{ font: `600 12px/1 ${T.mono}`, color: T.rec, background: T.recBg, borderRadius: 6, padding: "6px 10px" }}>
              REC {mmss}
            </span>
          )}
          {transcribing && (
            <span style={{ fontSize: 12.5, color: T.body, fontStyle: "italic" }}>
              Transcribing with speaker separation…
            </span>
          )}

          {recording && !useDeepgram && lastSpeaker && (
            <span
              title="Speaker inferred from what was said — edit the DR:/PT: prefix below if it guessed wrong."
              style={{ font: `600 12px/1 ${T.mono}`, color: T.accentInk, background: T.accentBg, border: `1px solid ${T.accentLine}`, borderRadius: 6, padding: "6px 10px", cursor: "help" }}
            >
              last: {lastSpeaker === "DR" ? "Doctor" : "Patient"}
            </span>
          )}

          {recording && !useDeepgram && (
            <span style={{ fontSize: 12.5, color: interim ? T.body : T.faint, fontStyle: interim ? "normal" : "italic", flex: 1, minWidth: 120 }}>
              {interim || "listening…"}
            </span>
          )}
        </div>
      )}

      <div style={{ marginTop: 6, fontSize: 11, color: T.faint, lineHeight: 1.45 }}>
        {useDeepgram ? (
          <>
            Audio is transcribed after you stop, by a medical speech model with real speaker
            separation (DR/PT labels stay editable below). For demo and test patients — a BAA
            for real patient conversations is still pending.
          </>
        ) : (
          <>
            Speaker labels (DR/PT) are inferred from what&rsquo;s said — fix any wrong prefix
            right in the text below. Demo dictation — uses the browser&rsquo;s speech engine
            (audio may be processed by the browser vendor). Not for real patient conversations
            until a BAA-covered transcription provider is connected.
          </>
        )}
      </div>
      {error && <div style={{ marginTop: 6, fontSize: 12, color: T.amberInk }}>{error}</div>}
    </div>
  );
}
