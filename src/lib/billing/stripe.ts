import Stripe from "stripe";
import type { CurrentClinician } from "@/lib/clinician";

// Billing (Stripe) — solo $99/mo and clinic $399/mo, both with a 14-day
// card-required trial, sold through Stripe Checkout (hosted; card data never
// touches this app). Webhooks mirror subscription state onto the clinician
// row; the app gates on that cache, never on a live Stripe call.
//
// GRACEFUL DEGRADATION: with no STRIPE_SECRET_KEY configured there is no
// paywall at all — dev, stub mode, CI, and the e2e suite behave exactly as
// before billing existed. The gate only exists where Stripe does.
//
// Founding beta (clinicians.is_beta) bypasses the paywall permanently —
// free access in exchange for an honest review.

export function isBillingConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_SOLO &&
    process.env.STRIPE_PRICE_CLINIC
  );
}

// Annual prices are optional — monthly billing works with or without them.
// The billing page only offers the monthly/annual toggle when both annual
// prices are configured.
export function isAnnualConfigured(): boolean {
  return !!(process.env.STRIPE_PRICE_SOLO_ANNUAL && process.env.STRIPE_PRICE_CLINIC_ANNUAL);
}

export type Interval = "month" | "year";

let stripeClient: Stripe | null = null;
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export type Plan = "solo" | "clinic";

export function priceIdForPlan(plan: Plan, interval: Interval = "month"): string {
  const key =
    interval === "year"
      ? plan === "solo"
        ? process.env.STRIPE_PRICE_SOLO_ANNUAL
        : process.env.STRIPE_PRICE_CLINIC_ANNUAL
      : plan === "solo"
        ? process.env.STRIPE_PRICE_SOLO
        : process.env.STRIPE_PRICE_CLINIC;
  if (!key) throw new Error(`Stripe price for plan "${plan}" (${interval}) is not configured.`);
  return key;
}

// All known price ids → plan, for the webhook's reverse mapping.
function planForPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_SOLO || priceId === process.env.STRIPE_PRICE_SOLO_ANNUAL) {
    return "solo";
  }
  if (priceId === process.env.STRIPE_PRICE_CLINIC || priceId === process.env.STRIPE_PRICE_CLINIC_ANNUAL) {
    return "clinic";
  }
  return null;
}

// The ONE access rule, used by every gated route and page:
//   beta → always in; otherwise a live (trialing/active) subscription; and
//   when billing isn't configured at all, everyone is in (see above).
export function hasActiveAccess(clinician: Pick<CurrentClinician, "isBeta" | "subscriptionStatus">): boolean {
  if (!isBillingConfigured()) return true;
  if (clinician.isBeta) return true;
  return clinician.subscriptionStatus === "trialing" || clinician.subscriptionStatus === "active";
}

// Map a Stripe subscription to the clinician-row cache. Pure — unit tested.
export function subscriptionToRow(sub: {
  id: string;
  status: Stripe.Subscription.Status;
  items: { data: Array<{ price: { id: string } }> };
  // Stripe moved period bounds onto the items in newer API versions; accept
  // both shapes so the mapping survives SDK upgrades.
  current_period_end?: number | null;
}): {
  stripe_subscription_id: string;
  subscription_status: "trialing" | "active" | "past_due" | "canceled" | "none";
  subscription_plan: Plan | null;
  current_period_end: string | null;
} {
  const plan = planForPriceId(sub.items.data[0]?.price.id);

  // Collapse Stripe's many states onto our enum. incomplete/unpaid/paused →
  // no access ("canceled" bucket) — fail closed, the portal can revive them.
  const status =
    sub.status === "trialing"
      ? ("trialing" as const)
      : sub.status === "active"
        ? ("active" as const)
        : sub.status === "past_due"
          ? ("past_due" as const)
          : ("canceled" as const);

  const periodEndRaw =
    sub.current_period_end ??
    (sub.items.data[0] as { current_period_end?: number } | undefined)?.current_period_end ??
    null;

  return {
    stripe_subscription_id: sub.id,
    subscription_status: status,
    subscription_plan: plan,
    current_period_end: periodEndRaw ? new Date(periodEndRaw * 1000).toISOString() : null,
  };
}
