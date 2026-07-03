import { listCases } from "@/lib/store";
import { getServerUser } from "@/lib/server-user";
import { listOpenFollowUps } from "@/lib/followup/store";
import { dueStatus } from "@/lib/followup/due";
import { FollowUpDashboard, type DashboardItem } from "@/components/followup/FollowUpDashboard";
import { CaseList, type CaseRow } from "@/components/cases/CaseList";
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

      <CaseList
        cases={cases.map(
          (c): CaseRow => ({
            encounterId: c.encounter.id,
            patientLabel: `${c.patient.ageYears ?? "—"}${c.patient.sex === "female" ? "F" : c.patient.sex === "male" ? "M" : ""}`,
            chiefComplaint: c.encounter.chiefComplaint ?? "",
            problems: c.encounter.problems.map((p: Problem) => p.label).join(", "),
            externalRef: c.patient.externalRef,
            isTestCase: c.patient.isTestCase ?? false,
            updatedAt: c.updatedAt,
          }),
        )}
      />

      <p className="text-xs text-slate-400">
        Stub mode: one seeded demo case. With Supabase configured, this lists the
        signed-in clinician&apos;s own cases (RLS-scoped).
      </p>
    </div>
  );
}
