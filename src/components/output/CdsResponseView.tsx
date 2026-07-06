"use client";

import { useState } from "react";
import type {
  CdsResponse,
  Differential,
  EvidenceStrength,
} from "@/lib/cds/schema";

// Structured output presentation. Each spec'd section is its own block:
// summary, differentials (likely / can't-miss), workup, management, the
// expandable reasoning + teaching (Moat 3), sources, and the persistent
// disclaimer. Evidence-strength tags appear on every recommendation.

export function CdsResponseView({
  response,
  model,
}: {
  response: CdsResponse;
  model: string;
}) {
  const [showReasoning, setShowReasoning] = useState(false);

  const likely = response.differentials.filter((d) => d.category === "likely");
  const cantMiss = response.differentials.filter((d) => d.category === "cant_miss");
  const possible = response.differentials.filter((d) => d.category === "possible");

  return (
    <article className="space-y-4">
      {/* Summary */}
      <Block>
        <div className="mb-2 flex items-center justify-between">
          <H>Summary</H>
          <div className="flex items-center gap-2">
            {model === "mock" && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-caution">
                stub mode
              </span>
            )}
            <CopyNoteButton response={response} />
          </div>
        </div>
        <p className="text-sm leading-relaxed text-body">{response.summary}</p>
      </Block>

      {/* Data points used (transparency) */}
      <Block>
        <H>Patient data used</H>
        <ul className="mt-2 space-y-1.5">
          {response.dataPointsUsed.map((d, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-ink">{d.label}</span>
              <span className="text-[#8b8779]"> — {d.relevance}</span>
            </li>
          ))}
        </ul>
      </Block>

      {/* Differentials */}
      {response.differentials.length > 0 && (
        <Block>
          <H>Differential considerations</H>
          <div className="mt-3 space-y-4">
            {cantMiss.length > 0 && (
              <DiffGroup label="Can't miss" tone="danger" items={cantMiss} />
            )}
            {likely.length > 0 && <DiffGroup label="Likely" tone="clinical" items={likely} />}
            {possible.length > 0 && (
              <DiffGroup label="Also possible" tone="slate" items={possible} />
            )}
          </div>
        </Block>
      )}

      {/* Workup */}
      {response.workup.length > 0 && (
        <Block>
          <H>Suggested workup to consider</H>
          <ul className="mt-2 space-y-2">
            {response.workup.map((w, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{w.test}</span>
                  <EvidenceTag e={w.evidence} />
                </div>
                <p className="text-[#8b8779]">{w.rationale}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* Management */}
      {response.management.length > 0 && (
        <Block>
          <H>Management options to weigh</H>
          <div className="mt-2 space-y-3">
            {response.management.map((m, i) => (
              <div key={i} className="rounded-md border border-[#EEEDE6] p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{m.option}</span>
                  <EvidenceTag e={m.evidence} />
                </div>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <PerksList label="Pros" items={m.pros} tone="text-emerald-700" />
                  <PerksList label="Cons" items={m.cons} tone="text-caution" />
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* Reasoning & teaching (expandable — Moat 3) */}
      <Block>
        <button
          onClick={() => setShowReasoning((s) => !s)}
          className="flex w-full items-center justify-between"
        >
          <H>Reasoning &amp; teaching</H>
          <span className="text-sm text-clinical">{showReasoning ? "Hide" : "Show reasoning"}</span>
        </button>
        {showReasoning && (
          <div className="mt-3 space-y-3">
            <p className="text-sm leading-relaxed text-body">{response.reasoningSummary}</p>
            {response.teaching.length > 0 && (
              <ul className="space-y-2">
                {response.teaching.map((t, i) => (
                  <li key={i} className="rounded-md bg-[#FBFAF6] p-3 text-sm">
                    <p className="font-medium text-ink">{t.point}</p>
                    <p className="text-[#8b8779]">{t.basis}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Block>

      {/* Uncertainties */}
      {response.uncertainties.length > 0 && (
        <Block tone="amber">
          <H>Uncertainty &amp; caveats</H>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-body">
            {response.uncertainties.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </Block>
      )}

      {/* Sources */}
      {response.citations.length > 0 && (
        <Block>
          <H>Sources</H>
          <ul className="mt-2 space-y-1 text-sm">
            {response.citations.map((c, i) => (
              <li key={i}>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-clinical underline">
                    {c.title}
                  </a>
                ) : (
                  <span className="text-ink">{c.title}</span>
                )}
                <span className="text-[#bcb7a9]"> · {c.source}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <p className="rounded-md bg-[#F1F0EB] px-4 py-3 text-xs leading-relaxed text-[#8b8779]">
        {response.disclaimer}
      </p>
    </article>
  );
}

function DiffGroup({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "danger" | "clinical" | "slate";
  items: Differential[];
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "clinical"
        ? "text-clinical"
        : "text-[#8b8779]";
  return (
    <div>
      <h4 className={`text-xs font-semibold uppercase tracking-wide ${toneClass}`}>{label}</h4>
      <ul className="mt-1.5 space-y-2">
        {items.map((d, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink">{d.condition}</span>
              <EvidenceTag e={d.evidence} />
            </div>
            <p className="text-[#8b8779]">{d.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceTag({ e }: { e: EvidenceStrength }) {
  const map: Record<EvidenceStrength, string> = {
    strong: "bg-emerald-100 text-emerald-800",
    moderate: "bg-sky-100 text-sky-800",
    weak: "bg-amber-100 text-caution",
    uncertain: "bg-[#EEEDE6] text-[#8b8779]",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${map[e]}`}>{e}</span>
  );
}

function PerksList({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-[#bcb7a9]">{label}</p>
      <ul className={`mt-0.5 list-disc pl-4 text-sm ${tone}`}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function CopyNoteButton({ response }: { response: CdsResponse }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(formatAsNote(response)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={copy} className="rounded border border-[#E6E4DB] px-2 py-0.5 text-xs text-[#8b8779] hover:bg-[#FBFAF6]">
      {copied ? "Copied" : "Copy as note"}
    </button>
  );
}

// "Copy as note" (Moat 2 export hook): a formatted A&P snippet the clinician
// reviews and pastes. The tool never writes to the EHR itself.
function formatAsNote(r: CdsResponse): string {
  const lines: string[] = ["ASSESSMENT (decision-support draft — clinician to review):", r.summary, ""];
  if (r.differentials.length) {
    lines.push("Differential:");
    for (const d of r.differentials) {
      const tag = d.category === "cant_miss" ? "[can't miss] " : d.category === "likely" ? "[likely] " : "";
      lines.push(`- ${tag}${d.condition} (${d.evidence})`);
    }
    lines.push("");
  }
  if (r.workup.length) {
    lines.push("Workup to consider:");
    r.workup.forEach((w) => lines.push(`- ${w.test} — ${w.rationale}`));
    lines.push("");
  }
  if (r.management.length) {
    lines.push("Management options:");
    r.management.forEach((m) => lines.push(`- ${m.option} (${m.evidence})`));
    lines.push("");
  }
  lines.push(`— ${r.disclaimer}`);
  return lines.join("\n");
}

function Block({ children, tone }: { children: React.ReactNode; tone?: "amber" }) {
  const border = tone === "amber" ? "border-amber-200 bg-amber-50" : "border-[#E6E4DB] bg-white";
  return <section className={`rounded-lg border p-5 ${border}`}>{children}</section>;
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-ink">{children}</h3>;
}
