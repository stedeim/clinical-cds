"use client";

import { useMemo, useState } from "react";

// Searchable case list (client island). The server passes a compact,
// PHI-minimal row shape; filtering happens locally — the search term never
// leaves the page. Matches across the patient descriptor, chief complaint,
// problems, and external ref, case-insensitively.

export interface CaseRow {
  encounterId: string;
  patientName?: string; // optional display name; absent = pseudonymous
  patientLabel: string; // "54F"
  chiefComplaint: string;
  problems: string; // comma-joined labels
  externalRef?: string;
  isTestCase: boolean;
  updatedAt: string;
}

export function CaseList({ cases }: { cases: CaseRow[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) =>
      [c.patientName ?? "", c.patientLabel, c.chiefComplaint, c.problems, c.externalRef ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [cases, query]);

  return (
    <div className="space-y-2">
      {cases.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cases — complaint, problem, ref…"
          className="w-full rounded-xl border border-[#E6E4DB] bg-white px-[15px] py-3 text-[14.5px] text-ink shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)] focus:border-[#CFDCD2] focus:outline-none"
          aria-label="Search cases"
        />
      )}

      {visible.length === 0 && (
        <p className="rounded-[14px] border border-[#E6E4DB] bg-white px-5 py-6 text-sm text-[#948d7c]">
          {query ? `No cases match “${query}”.` : "No cases yet."}
        </p>
      )}
      {visible.map((c) => (
        <a
          key={c.encounterId}
          href={`/cases/${c.encounterId}`}
          className="flex items-center gap-4 rounded-[14px] bg-white px-4 py-[14px] shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)] transition-transform hover:-translate-y-px"
        >
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#EEF2EE] text-xs font-semibold text-[#3c5646]">
            {c.patientName
              ? c.patientName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join("")
              : c.patientLabel}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-semibold leading-snug text-ink">
              {c.patientName ? (
                <>
                  {c.patientName}
                  <span className="ml-2 font-mono text-[11.5px] font-normal text-[#948d7c]">
                    {c.patientLabel}
                  </span>
                </>
              ) : (
                c.chiefComplaint || "No chief complaint"
              )}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[#6b665a]">
              {c.patientName ? `${c.chiefComplaint || "No chief complaint"} · ` : ""}
              {c.problems || "No problems listed"}
              {c.externalRef && (
                <span className="ml-1.5 font-mono text-[11.5px] text-[#948d7c]">{c.externalRef}</span>
              )}
              {c.isTestCase && (
                <span className="ml-1.5 rounded bg-[#F6EACB] px-1.5 py-0.5 text-[11px] font-semibold text-caution">
                  test case
                </span>
              )}
            </span>
          </span>
          <span className="shrink-0 text-[14px] font-semibold text-clinical">Open →</span>
        </a>
      ))}
    </div>
  );
}
