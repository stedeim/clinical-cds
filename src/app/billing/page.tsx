import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/server-user";
import { getCurrentClinician } from "@/lib/clinician";
import { hasActiveAccess, isBillingConfigured } from "@/lib/billing/stripe";
import { StartTrialButton, ManageBillingButton } from "@/components/billing/BillingActions";

// Billing home: start the 14-day trial (Solo or Clinic), see the current
// subscription state, or open the Stripe portal to manage/cancel. Beta
// clinicians see their standing grant instead of plan cards.

export const metadata = { title: "Billing — Pabaid" };

const PLAN_FEATURES: Record<"solo" | "clinic", string[]> = {
  solo: [
    "Dictated notes with provenance highlighting",
    "Dose ceilings, boxed warnings, allergy conflicts",
    "Cited reference engine, 7 frameworks",
    "Web + install to any phone",
  ],
  clinic: [
    "Everything in Solo, for the whole practice",
    "Six seats under one bill",
    "Shared patient continuity across the clinic",
    "Priority support",
  ],
};

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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col rounded-[18px] border border-[#E6E4DB] bg-white p-6">
              <div className="font-mono text-[13px] text-clinical">Solo</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-serif text-[38px] text-ink">$99</span>
                <span className="text-[13px] text-[#8b8779]">/ clinician / mo</span>
              </div>
              <ul className="mb-6 mt-4 flex-1 space-y-2">
                {PLAN_FEATURES.solo.map((f) => (
                  <li key={f} className="flex gap-2 text-[13.5px] text-[#3c3a33]">
                    <span className="text-clinical">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <StartTrialButton plan="solo" label="Try it for free for 14 days" />
            </div>
            <div className="flex flex-col rounded-[18px] bg-ink p-6 text-[#F5F4EF]">
              <div className="font-mono text-[13px] text-[#a8c6b1]">Clinic</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-serif text-[38px]">$399</span>
                <span className="text-[13px] text-[#a29d92]">/ mo · up to 6 clinicians</span>
              </div>
              <ul className="mb-6 mt-4 flex-1 space-y-2">
                {PLAN_FEATURES.clinic.map((f) => (
                  <li key={f} className="flex gap-2 text-[13.5px] text-[#e6e3d9]">
                    <span className="text-[#a8c6b1]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <StartTrialButton plan="clinic" label="Try it for free for 14 days" dark />
            </div>
          </div>
          <p className="text-[12.5px] text-[#8b8779]">
            More than 6 clinicians? <a className="underline" href="mailto:hello@pabaid.com">Talk to us</a> about custom pricing.
          </p>
        </div>
      )}
    </div>
  );
}
