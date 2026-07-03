"use client";

import { useState } from "react";
import type { FollowUp } from "@/lib/followup/schema";
import type { DueStatus } from "@/lib/followup/due";

// Cross-case follow-up dashboard on the home page: what needs chasing,
// worst first. Overdue and due-soon items get color; each row links to its
// case and offers the two loop-closing actions inline — send the reminder
// (stub-honest, as on the encounter page) and mark done when the patient
// reported back.

export interface DashboardItem {
  followUp: FollowUp;
  status: DueStatus;
  caseLabel: string; // e.g. "54F · Persistent dry cough"
}

const STATUS_STYLE: Record<DueStatus, { label: string; className: string }> = {
  overdue: { label: "overdue", className: "bg-red-100 text-red-800" },
  due_soon: { label: "due soon", className: "bg-amber-100 text-amber-800" },
  upcoming: { label: "upcoming", className: "bg-slate-100 text-slate-600" },
};

export function FollowUpDashboard({ items: initialItems }: { items: DashboardItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(op: "send" | "complete", id: string) {
    setBusy(id);
    setNotice(null);
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op, followUpId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed.");
      if (op === "complete") {
        setItems((prev) => prev.filter((it) => it.followUp.id !== id));
      } else {
        setItems((prev) =>
          prev.map((it) => (it.followUp.id === id ? { ...it, followUp: { ...it.followUp, status: "sent" } } : it)),
        );
        setNotice(data.dispatch?.detail ?? null);
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-baseline justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="font-semibold text-ink">Follow-ups</h2>
        <span className="text-xs text-slate-400">across all cases · worst first</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map(({ followUp: f, status, caseLabel }) => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status].className}`}>
              {STATUS_STYLE[status].label}
            </span>
            <span className="flex-1 leading-snug text-slate-700">
              {f.action}
              <span className="ml-2 text-xs text-slate-400">
                due {f.dueAt.slice(0, 10)} ·{" "}
                <a href={`/cases/${f.encounterId}`} className="text-clinical underline">
                  {caseLabel}
                </a>
              </span>
            </span>
            {f.status === "pending" && (
              <button
                onClick={() => act("send", f.id)}
                disabled={busy === f.id}
                className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-clinical hover:border-clinical disabled:opacity-40"
              >
                Send reminder
              </button>
            )}
            {f.status === "sent" && <span className="text-xs text-slate-400">reminder sent</span>}
            <button
              onClick={() => act("complete", f.id)}
              disabled={busy === f.id}
              className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-slate-500 disabled:opacity-40"
            >
              Mark done
            </button>
          </li>
        ))}
      </ul>
      {notice && <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">{notice}</p>}
    </div>
  );
}
