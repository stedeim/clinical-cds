"use client";

import { useState } from "react";
import type { FollowUp, FollowUpRecipientT } from "@/lib/followup/schema";
import type { FollowUpSuggestion } from "@/lib/followup/suggest";

// Follow-up reminders card (client island).
//
// The clinician creates a follow-up ("recheck K⁺/Cr", due in 2 weeks) and
// CHOOSES who gets reminded — patient, themselves, their assistant, or any
// mix. Suggestions come from the visit's own text (deterministic parser, no
// LLM); the clinician always confirms and edits before anything is created.
// "Send now" routes through the dispatch seam — in stub mode that records an
// auditable event and says so honestly; it never pretends an SMS went out.

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
  serif: "'Newsreader',ui-serif,Georgia,serif",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  mono: "'IBM Plex Mono',ui-monospace,monospace",
};

const RECIPIENTS: { id: FollowUpRecipientT; label: string }[] = [
  { id: "patient", label: "Patient" },
  { id: "clinician", label: "Me" },
  { id: "assistant", label: "My assistant" },
];

function isoDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FollowUpCard({
  encounterId,
  initialFollowUps,
  suggestions,
}: {
  encounterId: string;
  initialFollowUps: FollowUp[];
  suggestions: FollowUpSuggestion[];
}) {
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps);
  const [action, setAction] = useState("");
  const [dueAt, setDueAt] = useState(isoDatePlusDays(14));
  const [recipients, setRecipients] = useState<FollowUpRecipientT[]>(["patient", "clinician"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function toggleRecipient(id: FollowUpRecipientT) {
    setRecipients((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function applySuggestion(s: FollowUpSuggestion) {
    setAction(s.action);
    setDueAt(isoDatePlusDays(s.dueInDays));
  }

  async function create() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "create", encounterId, action: action.trim(), dueAt, recipients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the follow-up.");
      setFollowUps((prev) =>
        [...prev, data.followUp as FollowUp].sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      );
      setAction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function sendNow(id: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "send", followUpId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send the reminder.");
      setFollowUps((prev) => prev.map((f) => (f.id === id ? { ...f, status: "sent" } : f)));
      setNotice(data.dispatch.detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const canCreate = action.trim().length >= 3 && recipients.length > 0 && !busy;

  return (
    <div style={{ background: T.card, borderRadius: 16, padding: "18px 20px", boxShadow: "0 6px 22px -14px rgba(15,43,49,.32)", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: `1px solid ${T.line}`, paddingBottom: 10, marginBottom: 13 }}>
        <div style={{ font: `600 16px/1 ${T.serif}`, color: T.ink }}>Follow-up reminders</div>
        <div style={{ fontSize: 10.5, color: T.faint }}>you choose who gets reminded</div>
      </div>

      {suggestions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>
            Suggested from this visit
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => applySuggestion(s)}
                style={{ textAlign: "left", font: `400 12px/1.45 ${T.sans}`, color: T.body, background: T.accentBg2, border: `1px solid ${T.accentLine}`, borderRadius: 9, padding: "8px 11px", cursor: "pointer" }}
              >
                {s.action} <span style={{ color: T.accentInk, fontWeight: 600 }}>· due in {s.dueInDays} days</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "11px 12px", background: T.panelBg, border: `1px solid ${T.line}`, borderRadius: 12 }}>
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="What needs to happen? e.g. Recheck K⁺/creatinine"
          style={{ width: "100%", boxSizing: "border-box", font: `400 12.5px/1.5 ${T.sans}`, color: T.ink, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 11px" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 9, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.muted }}>
            due
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              style={{ font: `400 12px ${T.mono}`, color: T.ink, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 7, padding: "5px 8px" }}
            />
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 11.5, color: T.muted }}>remind:</span>
            {RECIPIENTS.map((r) => {
              const on = recipients.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggleRecipient(r.id)}
                  aria-pressed={on}
                  style={{
                    font: `600 11px/1 ${T.sans}`,
                    color: on ? "#fff" : T.accentInk,
                    background: on ? T.accent : T.accentBg,
                    border: `1px solid ${on ? T.accent : T.accentLine}`,
                    borderRadius: 16,
                    padding: "6px 11px",
                    cursor: "pointer",
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={create}
            disabled={!canCreate}
            style={{ marginLeft: "auto", font: `600 12px/1 ${T.sans}`, color: "#fff", background: canCreate ? T.accent : T.faint, border: "none", borderRadius: 8, padding: "8px 14px", cursor: canCreate ? "pointer" : "default" }}
          >
            Add follow-up
          </button>
        </div>
        {recipients.length === 0 && (
          <div style={{ marginTop: 7, fontSize: 11, color: T.amberInk }}>Pick at least one recipient.</div>
        )}
      </div>

      {followUps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
          {followUps.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 12.5, color: T.body }}>
              <span style={{ flex: 1, lineHeight: 1.45 }}>
                {f.action}
                <span style={{ color: T.muted }}> · due {f.dueAt.slice(0, 10)} · to: {f.recipients.map((r) => RECIPIENTS.find((x) => x.id === r)?.label ?? r).join(", ")}</span>
              </span>
              {f.status === "pending" ? (
                <button
                  onClick={() => sendNow(f.id)}
                  disabled={busy}
                  style={{ font: `600 11px/1 ${T.sans}`, color: T.accent, background: T.accentBg, border: `1px solid ${T.accentLine}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Send now
                </button>
              ) : (
                <span style={{ font: `600 10.5px/1 ${T.sans}`, color: T.accentInk, background: T.accentBg, borderRadius: 7, padding: "5px 9px", whiteSpace: "nowrap" }}>
                  {f.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {notice && <div style={{ marginTop: 10, fontSize: 11.5, color: T.accentInk, background: T.accentBg2, border: `1px solid ${T.accentLine}`, borderRadius: 9, padding: "8px 11px", lineHeight: 1.5 }}>{notice}</div>}
      {error && <div style={{ marginTop: 10, fontSize: 11.5, color: T.amberInk }}>{error}</div>}
    </div>
  );
}
