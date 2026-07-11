import { listCases } from "@/lib/store";
import { getServerUser } from "@/lib/server-user";
import { getCurrentClinician } from "@/lib/clinician";
import { hasActiveAccess, isBillingConfigured } from "@/lib/billing/stripe";
import { listOpenFollowUps } from "@/lib/followup/store";
import { dueStatus } from "@/lib/followup/due";
import { FollowUpDashboard, type DashboardItem } from "@/components/followup/FollowUpDashboard";
import { CaseList, type CaseRow } from "@/components/cases/CaseList";
import { LandingPage } from "@/components/marketing/LandingPage";
import type { Problem } from "@/lib/types";

// Case list — entry point. Server Component: reads the data layer on the server.
export default async function HomePage() {
  const user = await getServerUser();
  // Signed-out visitors get the marketing landing page; the case dashboard
  // is the signed-in home. (listCases requires a clinician id in Supabase mode.)
  if (!user) return <LandingPage />;
  const cases = await listCases(user.id);
  const clinician = await getCurrentClinician(user.id);

  // "Good morning, Dr. Chen" — the v2 design's greeting. Server-local time is
  // an approximation, so the phrasing degrades gracefully around midnight.
  const hour = new Date().getHours();
  const daypart = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const surname = clinician?.fullName?.trim().split(/\s+/).at(-1);
  const greeting = surname ? `Good ${daypart}, Dr. ${surname}` : "Your cases";

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
        caseLabel:
          c.patient.displayName ??
          `${c.patient.ageYears ?? "—"}${sex} · ${c.encounter.chiefComplaint ?? "case"}`,
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
            {greeting}
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

      {/* Verification pending is a waiting room, not a dead end: say so, and
          give the doctor something real to do meanwhile. */}
      {/* Verified but not yet subscribed (and not beta): the trial is the
          next step, said plainly. */}
      {clinician && clinician.isVerified && isBillingConfigured() && !hasActiveAccess(clinician) && (
        <a
          href="/billing"
          className="block rounded-xl border border-[#CFDCD2] bg-[#EEF2EE] px-4 py-3 text-[13.5px] leading-snug text-[#3c5646]"
        >
          <b className="font-semibold">You&rsquo;re verified.</b> Start your 14-day free trial
          to create cases — cancel anytime during the trial and you won&rsquo;t be charged. →
        </a>
      )}

      {clinician && !clinician.isVerified && (
        <div className="rounded-xl border border-[#D9B85E] bg-[#F6EACB] px-4 py-3 text-[13.5px] leading-snug text-caution">
          <b className="font-semibold">Verification pending.</b> CDS output unlocks when your
          clinician verification completes.{" "}
          <a href="/sample" className="font-semibold underline">
            Explore the sample encounter meanwhile →
          </a>
        </div>
      )}

      <FollowUpDashboard items={followUpItems} />

      {cases.length === 0 ? (
        /* Never an empty start: the sample case gives a new account something
           to open on day one, and the first-case prompt names the next step. */
        <div className="space-y-2">
          <a
            href="/sample"
            className="flex items-center gap-4 rounded-[14px] bg-white px-4 py-[14px] shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)] transition-transform hover:-translate-y-px"
          >
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#EEF2EE] text-xs font-semibold text-[#3c5646]">
              MC
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-semibold leading-snug text-ink">
                Margaret Chen
                <span className="ml-2 rounded bg-[#EEF2EE] px-1.5 py-0.5 text-[11px] font-semibold text-[#3c5646]">
                  sample
                </span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-[#6b665a]">
                See the dose flag, allergy conflict, and grounded note working — nothing saved
              </span>
            </span>
            <span className="shrink-0 text-[14px] font-semibold text-clinical">Explore →</span>
          </a>
          <a
            href="/cases/new"
            className="block rounded-[14px] border-2 border-dashed border-[#CFDCD2] px-4 py-[18px] text-center text-[14px] font-semibold text-[#3c5646]"
          >
            + Create your first case — three quick steps
          </a>
        </div>
      ) : (
        <CaseList
          cases={cases.map(
            (c): CaseRow => ({
              encounterId: c.encounter.id,
              patientName: c.patient.displayName,
              patientLabel: `${c.patient.ageYears ?? "—"}${c.patient.sex === "female" ? "F" : c.patient.sex === "male" ? "M" : ""}`,
              chiefComplaint: c.encounter.chiefComplaint ?? "",
              problems: c.encounter.problems.map((p: Problem) => p.label).join(", "),
              externalRef: c.patient.externalRef,
              isTestCase: c.patient.isTestCase ?? false,
              updatedAt: c.updatedAt,
            }),
          )}
        />
      )}

      <p className="text-xs text-[#948d7c]">
        Stub mode: one seeded demo case. With Supabase configured, this lists the
        signed-in clinician&apos;s own cases (RLS-scoped).
      </p>
    </div>
  );
}
