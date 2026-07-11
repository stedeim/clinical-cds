import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hasActiveAccess, subscriptionToRow, isBillingConfigured } from "@/lib/billing/stripe";

// The access rule and the webhook mapping are the billing system's brain;
// both are pure, so they get exhaustive coverage here. Checkout/portal/
// webhook plumbing is exercised against Stripe test mode instead.

const ENV_KEYS = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_SOLO", "STRIPE_PRICE_CLINIC"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_PRICE_SOLO = "price_solo_x";
  process.env.STRIPE_PRICE_CLINIC = "price_clinic_x";
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("hasActiveAccess", () => {
  it("grants beta clinicians access regardless of subscription", () => {
    expect(hasActiveAccess({ isBeta: true, subscriptionStatus: "none" })).toBe(true);
    expect(hasActiveAccess({ isBeta: true, subscriptionStatus: "canceled" })).toBe(true);
  });

  it("grants trialing and active subscriptions", () => {
    expect(hasActiveAccess({ isBeta: false, subscriptionStatus: "trialing" })).toBe(true);
    expect(hasActiveAccess({ isBeta: false, subscriptionStatus: "active" })).toBe(true);
  });

  it("denies none, past_due, and canceled", () => {
    expect(hasActiveAccess({ isBeta: false, subscriptionStatus: "none" })).toBe(false);
    expect(hasActiveAccess({ isBeta: false, subscriptionStatus: "past_due" })).toBe(false);
    expect(hasActiveAccess({ isBeta: false, subscriptionStatus: "canceled" })).toBe(false);
  });

  it("opens fully when billing is not configured (dev/stub/CI)", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(isBillingConfigured()).toBe(false);
    expect(hasActiveAccess({ isBeta: false, subscriptionStatus: "none" })).toBe(true);
  });
});

describe("subscriptionToRow", () => {
  const base = (over: Partial<Parameters<typeof subscriptionToRow>[0]>) =>
    subscriptionToRow({
      id: "sub_1",
      status: "trialing",
      items: { data: [{ price: { id: "price_solo_x" } }] },
      current_period_end: 1_800_000_000,
      ...over,
    });

  it("maps a trialing solo subscription", () => {
    const row = base({});
    expect(row).toMatchObject({
      stripe_subscription_id: "sub_1",
      subscription_status: "trialing",
      subscription_plan: "solo",
    });
    expect(row.current_period_end).toMatch(/^2027-/);
  });

  it("maps the clinic price to the clinic plan", () => {
    expect(base({ items: { data: [{ price: { id: "price_clinic_x" } }] } }).subscription_plan).toBe(
      "clinic",
    );
  });

  it("collapses unknown/inactive Stripe states to canceled (fail closed)", () => {
    for (const status of ["incomplete", "incomplete_expired", "unpaid", "paused", "canceled"] as const) {
      expect(base({ status }).subscription_status).toBe("canceled");
    }
  });

  it("keeps past_due distinct so the UI can prompt a card fix", () => {
    expect(base({ status: "past_due" }).subscription_status).toBe("past_due");
  });

  it("tolerates a missing period end", () => {
    expect(base({ current_period_end: null }).current_period_end).toBeNull();
  });
});
