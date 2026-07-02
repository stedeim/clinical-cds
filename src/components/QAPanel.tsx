"use client";

import { useState } from "react";
import type { CdsResponse } from "@/lib/cds/schema";
import type { GuidelineFramework } from "@/lib/types";
import { FRAMEWORK_IDS, FRAMEWORKS } from "@/lib/guidelines";
import { CdsResponseView } from "@/components/output/CdsResponseView";

const FRAMEWORK_OPTIONS = FRAMEWORK_IDS.map((id) => ({ id, label: FRAMEWORKS[id].shortLabel }));

const SUGGESTIONS = [
  "What should I consider for this presentation?",
  "What workup is reasonable given these labs?",
  "Could a medication be contributing?",
];

// Client component: holds the question, calls the server route, renders the
// validated structured response. Note it sends only the encounterId + question —
// the PHI-bearing case payload never round-trips through the browser.
// `initialFramework` is the geo-detected default (see lib/geo.ts) — the select
// always remains a manual override.
export function QAPanel({
  encounterId,
  initialFramework = "US",
}: {
  encounterId: string;
  initialFramework?: GuidelineFramework;
}) {
  const [question, setQuestion] = useState("");
  const [framework, setFramework] = useState<GuidelineFramework>(initialFramework);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ response: CdsResponse; model: string } | null>(null);

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encounterId, question: text, framework }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Ask about this patient</h2>
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value as GuidelineFramework)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            aria-label="Guideline framework"
          >
            {FRAMEWORK_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Given this patient, what should I consider?"
          rows={3}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-clinical focus:outline-none"
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setQuestion(s)}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => ask(question)}
            disabled={loading || question.trim().length < 3}
            className="rounded-md bg-clinical px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Thinking…" : "Get considerations"}
          </button>
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </div>

      {result && <CdsResponseView response={result.response} model={result.model} />}
    </section>
  );
}
