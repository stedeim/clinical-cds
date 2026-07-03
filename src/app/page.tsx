import { listCases } from "@/lib/store";
import { getServerUser } from "@/lib/server-user";
import { listOpenFollowUps } from "@/lib/followup/store";
import { dueStatus } from "@/lib/followup/due";
import { FollowUpDashboard, type DashboardItem } from "@/components/followup/FollowUpDashboard";
import type { Problem } from "@/lib/types";

// Case list — entry point. Server Component: reads the data layer on the server.
export default async function HomePage() {
  const user = await getServerUser();
  const cases = await listCases(user?.id);

  // Cross-case follow-up feed: every open item, worst first. Case labels come
  // from the already-loaded case list; a follow-up whose case is gone (stub
  // store reset) is dropped rather than shown as an orphan.
  const now = new Date();
  const caseById = new Map(cases.map((c) => [c.encounter.id, c]));
  const followUpItems: DashboardItem[] = (user ? listOpenFollowUps(user.id) : [])
    .filter((f) => caseById.has(f.encounterId))
    .map((f) => {
      const c = caseById.get(f.encounterId)!;
      const sex = c.patient.sex === "female" ? "F" : c.patient.sex === "male" ? "M" : "";
      return {
        followUp: f,
        status: dueStatus(f.dueAt, now),
        caseLabel: `${c.patient.ageYears ?? "—"}${sex} · ${c.encounter.chiefComplaint ?? "case"}`,
      };
    })
    .sort((a, b) => {
      const rank = { overdue: 0, due_soon: 1, upcoming: 2 } as const;
      return rank[a.status] - rank[b.status] || a.followUp.dueAt.localeCompare(b.followUp.dueAt);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your cases</h1>
          <p className="mt-1 text-sm text-slate-600">
            Select a case to ask encounter-native questions about that patient.
          </p>
        </div>
        {user && (
          <a
            href="/cases/new"
            className="rounded-md bg-clinical px-4 py-2 text-sm font-medium text-white"
          >
            New case
          </a>
        )}
      </div>

      <FollowUpDashboard items={followUpItems} />

      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {cases.map((c) => (
          <li key={c.encounter.id}>
            <a
              href={`/cases/${c.encounter.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-ink">
                  {c.patient.ageYears}
                  {c.patient.sex === "female" ? "F" : c.patient.sex === "male" ? "M" : ""} ·{" "}
                  {c.encounter.chiefComplaint ?? "No chief complaint"}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {c.encounter.problems.map((p: Problem) => p.label).join(", ") || "No problems listed"}
                  {c.patient.isTestCase && (
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

      <p className="text-xs text-slate-400">
        Stub mode: one seeded demo case. With Supabase configured, this lists the
        signed-in clinician&apos;s own cases (RLS-scoped).
      </p>
    </div>
  );
}
