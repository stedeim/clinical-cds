"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AllergySuggestion } from "@/lib/history/allergy-scan";
import { T } from "@/lib/ui/tokens";

// Document-scan allergy suggestions: "this document mentions X — add it?"
// The scan proposes with the source sentence shown; only the clinician's
// click writes the record. Adding refreshes the page so the conflict engine
// re-runs server-side against the updated allergy list.

export function AllergySuggestions({
  encounterId,
  suggestions,
}: {
  encounterId: string;
  suggestions: AllergySuggestion[];
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = suggestions.filter((s) => !dismissed.has(s.substance));
  if (visible.length === 0) return null;

  async function add(s: AllergySuggestion) {
    setBusy(s.substance);
    setError(null);
    try {
      const res = await fetch("/api/allergies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ encounterId, substance: s.substance, sourceDocument: s.documentName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add the allergy.");
      // Server state changed — refresh so the allergy check re-runs.
      router.refresh();
      setDismissed((prev) => new Set(prev).add(s.substance));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the allergy.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      {visible.map((s) => (
        <div key={s.substance} style={{ padding: "9px 11px", background: T.amberBg, border: `1px solid ${T.amberLine}`, borderRadius: 10 }}>
          <div style={{ font: `600 12.5px/1.4 ${T.sans}`, color: T.amberInk }}>
            Document mentions a possible <b>{s.substance}</b> allergy
          </div>
          <div style={{ fontSize: 11.5, color: T.amberInk, opacity: 0.85, lineHeight: 1.45, marginTop: 3, fontStyle: "italic" }}>
            &ldquo;{s.context}&rdquo;
            <span style={{ font: `500 10.5px ${T.mono}`, fontStyle: "normal", marginLeft: 5 }}>— {s.documentName}</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
            <button
              onClick={() => add(s)}
              disabled={busy === s.substance}
              style={{ font: `600 12px/1 ${T.sans}`, color: "#fff", background: T.accent, border: "none", borderRadius: 7, padding: "6px 11px", cursor: "pointer" }}
            >
              {busy === s.substance ? "Adding…" : "Add to record"}
            </button>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(s.substance))}
              style={{ font: `600 12px/1 ${T.sans}`, color: T.amberInk, background: "none", border: `1px solid ${T.amberLine}`, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
      {error && <div style={{ fontSize: 12, color: T.amberInk }}>{error}</div>}
    </div>
  );
}
