"use client";

import { useState } from "react";
import { StartTrialButton } from "@/components/billing/BillingActions";

// Plan cards with an optional monthly/annual toggle. When annual is
// available, picking it shows the discounted price and the CTA starts a
// yearly subscription; monthly is untouched. The toggle is hidden entirely
// when annual prices aren't configured, so nothing implies an option that
// doesn't exist.

const FEATURES = {
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

// Prices kept in sync with the Stripe price objects. Annual = 20% off (two
// months free), the standard SaaS discount.
const PRICING = {
  month: {
    solo: { big: "$99", unit: "/ clinician / mo", note: "Billed monthly · cancel anytime" },
    clinic: { big: "$399", unit: "/ mo · up to 6 clinicians", note: "$66.50 per clinician" },
  },
  year: {
    solo: { big: "$79", unit: "/ clinician / mo", note: "$948 billed yearly — 2 months free" },
    clinic: { big: "$319", unit: "/ mo · up to 6 clinicians", note: "$3,828 billed yearly — 2 months free" },
  },
} as const;

export function PlanChooser({ annualAvailable }: { annualAvailable: boolean }) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const active = annualAvailable ? interval : "month";
  const p = PRICING[active];

  return (
    <div className="space-y-4">
      {annualAvailable && (
        <div className="inline-flex rounded-full border border-[#E6E4DB] bg-white p-1 text-[13px] font-semibold">
          {(["month", "year"] as const).map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={
                active === iv
                  ? "rounded-full bg-clinical px-4 py-1.5 text-white"
                  : "rounded-full px-4 py-1.5 text-[#6b665a]"
              }
            >
              {iv === "month" ? "Monthly" : "Annual"}
              {iv === "year" && <span className="ml-1 opacity-80">· save 20%</span>}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-[18px] border border-[#E6E4DB] bg-white p-6">
          <div className="font-mono text-[13px] text-clinical">Solo</div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-serif text-[38px] text-ink">{p.solo.big}</span>
            <span className="text-[13px] text-[#8b8779]">{p.solo.unit}</span>
          </div>
          <div className="mt-1 text-[12.5px] text-[#8b8779]">{p.solo.note}</div>
          <ul className="mb-6 mt-4 flex-1 space-y-2">
            {FEATURES.solo.map((f) => (
              <li key={f} className="flex gap-2 text-[13.5px] text-[#3c3a33]">
                <span className="text-clinical">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <StartTrialButton plan="solo" interval={active} label="Try it for free for 14 days" />
          <div className="mt-2.5 text-center text-[12px] text-[#8b8779]">
            Cancel anytime during the trial — you won&rsquo;t be charged.
          </div>
        </div>

        <div className="flex flex-col rounded-[18px] bg-ink p-6 text-[#F5F4EF]">
          <div className="font-mono text-[13px] text-[#a8c6b1]">Clinic</div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-serif text-[38px]">{p.clinic.big}</span>
            <span className="text-[13px] text-[#a29d92]">{p.clinic.unit}</span>
          </div>
          <div className="mt-1 text-[12.5px] text-[#a29d92]">{p.clinic.note}</div>
          <ul className="mb-6 mt-4 flex-1 space-y-2">
            {FEATURES.clinic.map((f) => (
              <li key={f} className="flex gap-2 text-[13.5px] text-[#e6e3d9]">
                <span className="text-[#a8c6b1]">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <StartTrialButton plan="clinic" interval={active} label="Try it for free for 14 days" dark />
          <div className="mt-2.5 text-center text-[12px] text-[#a29d92]">
            Cancel anytime during the trial — you won&rsquo;t be charged.
          </div>
        </div>
      </div>
      <p className="text-[12.5px] text-[#8b8779]">
        More than 6 clinicians? <a className="underline" href="mailto:hello@pabaid.com">Talk to us</a> about custom pricing.
      </p>
    </div>
  );
}
