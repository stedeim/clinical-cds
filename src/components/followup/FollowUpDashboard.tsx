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
  overdue: { label: "overdue", className: "bg-[#FBEEEB] text-danger" },
  due_soon: { label: "due soon", className: "bg-[#F6EACB] text-caution" },
  upcoming: { label: "upcoming", className: "bg-[#FBFAF6] text-[#6b665a]" },
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
    <div className="overflow-hidden rounded-[14px] bg-white shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)]">
      <div className="flex items-baseline justify-between border-b border-[#EEEDE6] px-4 py-3">
        <h2 className="font-serif text-[15px] font-semibold text-ink">Follow-ups</h2>
        <span className="text-[12px] text-[#948d7c]">across all cases · worst first</span>
      </div>
      <ul className="divide-y divide-[#FBFAF6]">
        {items.map(({ followUp: f, status, caseLabel }) => (
          <li key={f.id} className="flex flex-wrap items-center gap-2.5 px-4 py-[11px] text-[14px]">
            <span
              className={`shrink-0 rounded-xl px-[9px] py-1 text-[11px] font-semibold ${STATUS_STYLE[status].className}`}
            >
              {STATUS_STYLE[status].label}
            </span>
            <span className="flex-1 leading-snug text-body">
              {f.action}
              <span className="ml-2 text-[12px] text-[#6b665a]">
                due {f.dueAt.slice(0, 10)} ·{" "}
                <a href={`/cases/${f.encounterId}`} className="text-[#3c5646] underline">
                  {caseLabel}
                </a>
              </span>
            </span>
            {f.status === "pending" && (
              <button
                onClick={() => act("send", f.id)}
                disabled={busy === f.id}
                className="rounded-[7px] border border-[#CFDCD2] bg-[#F5F7F4] px-2.5 py-1.5 text-[12px] font-semibold text-clinical disabled:opacity-40"
              >
                Send reminder
              </button>
            )}
            {f.status === "sent" && <span className="text-[12px] text-[#948d7c]">reminder sent</span>}
            <button
              onClick={() => act("complete", f.id)}
              disabled={busy === f.id}
              className="rounded-[7px] border border-[#E6E4DB] px-2.5 py-1.5 text-[12px] font-semibold text-[#6b665a] hover:border-[#948d7c] disabled:opacity-40"
            >
              Mark done
            </button>
          </li>
        ))}
      </ul>
      {notice && <p className="border-t border-[#EEEDE6] px-4 py-2.5 text-xs text-[#6b665a]">{notice}</p>}
    </div>
  );
}
