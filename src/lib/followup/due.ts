// Due-status bucketing for the follow-up dashboard. Pure so the exact
// boundary behavior is testable: a follow-up is overdue strictly after its
// due date's end-of-day (a "due 2026-07-02" item is NOT overdue on the 2nd).

export type DueStatus = "overdue" | "due_soon" | "upcoming";

const DAY_MS = 24 * 60 * 60 * 1000;

export function dueStatus(dueAt: string, now: Date, soonDays = 7): DueStatus {
  const due = new Date(dueAt);
  // End of the due day, UTC — anything before that is on time.
  const endOfDueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 1) - 1;
  if (now.getTime() > endOfDueDay) return "overdue";
  if (now.getTime() > endOfDueDay - soonDays * DAY_MS) return "due_soon";
  return "upcoming";
}
