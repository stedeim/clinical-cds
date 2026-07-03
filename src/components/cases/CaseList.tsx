"use client";

import { useMemo, useState } from "react";

// Searchable case list (client island). The server passes a compact,
// PHI-minimal row shape; filtering happens locally — the search term never
// leaves the page. Matches across the patient descriptor, chief complaint,
// problems, and external ref, case-insensitively.

export interface CaseRow {
  encounterId: string;
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
      [c.patientLabel, c.chiefComplaint, c.problems, c.externalRef ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [cases, query]);

  return (
    <div className="space-y-3">
      {cases.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cases — complaint, problem, ref…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-clinical focus:outline-none"
          aria-label="Search cases"
        />
      )}

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {visible.length === 0 && (
          <li className="px-5 py-6 text-sm text-slate-400">
            {query ? `No cases match “${query}”.` : "No cases yet."}
          </li>
        )}
        {visible.map((c) => (
          <li key={c.encounterId}>
            <a
              href={`/cases/${c.encounterId}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-ink">
                  {c.patientLabel} · {c.chiefComplaint || "No chief complaint"}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {c.problems || "No problems listed"}
                  {c.externalRef && (
                    <span className="ml-2 font-mono text-xs text-slate-400">{c.externalRef}</span>
                  )}
                  {c.isTestCase && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-caution">
                      test case
                    </span>
                  )}
                </p>
              </div>
              <span className="text-clinical">Open →</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
