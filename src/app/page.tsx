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

  const chasing = followUpItems.filter((i) => i.status !== "upcoming").length;

  return (
    <div className="mx-auto max-w-[860px] space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-tight text-ink">
            Your cases
          </h1>
          <p className="mt-1 text-[14px] text-[#6b665a]">
            {cases.length} case{cases.length === 1 ? "" : "s"}
            {chasing > 0 && <> · {chasing} follow-up{chasing === 1 ? "" : "s"} need chasing</>}
          </p>
        </div>
        {user && (
          <a
            href="/cases/new"
            className="rounded-[10px] bg-clinical px-[18px] py-[11px] text-[14px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(78,107,87,.55)]"
          >
            + New case
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

      <p className="text-xs text-[#948d7c]">
        Stub mode: one seeded demo case. With Supabase configured, this lists the
        signed-in clinician&apos;s own cases (RLS-scoped).
      </p>
    </div>
  );
}
