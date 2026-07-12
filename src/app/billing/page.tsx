import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/server-user";
import { getCurrentClinician } from "@/lib/clinician";
import { hasActiveAccess, isBillingConfigured, isAnnualConfigured } from "@/lib/billing/stripe";
import { ManageBillingButton } from "@/components/billing/BillingActions";
import { PlanChooser } from "@/components/billing/PlanChooser";

// Billing home: start the 14-day trial (Solo or Clinic), see the current
// subscription state, or open the Stripe portal to manage/cancel. Beta
// clinicians see their standing grant instead of plan cards.

export const metadata = { title: "Billing — Pabaid" };

export default async function BillingPage() {
  const user = await getServerUser();
  if (!user) redirect("/auth/login");
  const clinician = await getCurrentClinician(user.id);
  if (!clinician) redirect("/auth/login");

  const statusLabel: Record<string, string> = {
    trialing: "Free trial",
    active: "Active",
    past_due: "Payment past due",
    canceled: "Canceled",
    none: "No subscription",
  };

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <div>
        <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-tight text-ink">
          Billing
        </h1>
        <p className="mt-1 text-[14px] text-[#6b665a]">
          {clinician.fullName}
          {clinician.credential ? `, ${clinician.credential}` : ""}
        </p>
      </div>

      {!isBillingConfigured() ? (
        <div className="rounded-[14px] border border-[#E6E4DB] bg-white p-5 text-sm text-[#6b665a]">
          Billing isn&rsquo;t configured in this environment — full access is open.
        </div>
      ) : clinician.isBeta ? (
        <div className="rounded-[14px] border border-[#CFDCD2] bg-[#EEF2EE] p-6">
          <div className="font-serif text-lg font-semibold text-ink">
            You&rsquo;re a founding beta clinician.
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-[#3c5646]">
            Pabaid is free for you — our side of the deal. Yours is an honest review when
            you&rsquo;ve used it in real clinic days. No card, no trial clock, no paywall.
          </p>
        </div>
      ) : hasActiveAccess(clinician) ? (
        <div className="space-y-4">
          <div className="rounded-[14px] border border-[#CFDCD2] bg-[#EEF2EE] p-6">
            <div className="font-serif text-lg font-semibold text-ink">
              {statusLabel[clinician.subscriptionStatus]}
              {clinician.subscriptionPlan ? ` · ${clinician.subscriptionPlan === "solo" ? "Solo" : "Clinic"}` : ""}
            </div>
            {clinician.currentPeriodEnd && (
              <p className="mt-2 text-[14px] text-[#3c5646]">
                {clinician.subscriptionStatus === "trialing" ? "Trial ends" : "Renews"}{" "}
                {new Date(clinician.currentPeriodEnd).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {clinician.subscriptionStatus === "trialing" &&
                  " — cancel before then and you won't be charged."}
              </p>
            )}
          </div>
          <ManageBillingButton />
        </div>
      ) : (
        <div className="space-y-4">
          {clinician.subscriptionStatus === "past_due" && (
            <div className="rounded-xl border border-[#E7B8AC] bg-[#FBEEEB] px-4 py-3 text-[13.5px] text-danger">
              Your last payment didn&rsquo;t go through — update your card to restore access.
            </div>
          )}
          <p className="text-[15px] leading-relaxed text-[#5c574a]">
            Start with 14 days free. Cancel anytime during the trial and you won&rsquo;t be
            charged.
          </p>
          <PlanChooser annualAvailable={isAnnualConfigured()} />
        </div>
      )}
    </div>
  );
}
