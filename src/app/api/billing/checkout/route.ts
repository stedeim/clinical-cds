import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { getStripe, isBillingConfigured, priceIdForPlan } from "@/lib/billing/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Start a subscription: creates a Stripe Checkout session (hosted page) for
// the chosen plan with the 14-day card-required trial. Verified clinicians
// only — verification is the clinical gate and it comes before money.
// Beta accounts have no reason to be here but nothing breaks if they visit.

export const runtime = "nodejs";

const Body = z.object({ plan: z.enum(["solo", "clinic"]) });

export async function POST(req: Request) {
  const rl = await rateLimit(`checkout:${clientIp(req)}`, { max: 10, windowMs: 600_000, label: "checkout" });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let clinician;
  try {
    clinician = await requireVerifiedClinician(await currentUserIdFromCookies());
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const admin = createServiceClient();

    // One Stripe customer per clinician, created lazily and cached.
    let customerId = clinician.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: clinician.fullName,
        metadata: { clinician_id: clinician.id },
      });
      customerId = customer.id;
      await admin.from("clinicians").update({ stripe_customer_id: customerId }).eq("id", clinician.id);
    }

    const origin = req.headers.get("origin") ?? "https://pabaid.com";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdForPlan(body.plan), quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { clinician_id: clinician.id, plan: body.plan },
      },
      // Card up front (the decided trial shape); cancelable in the portal.
      payment_method_collection: "always",
      allow_promotion_codes: true,
      success_url: `${origin}/billing?state=started`,
      cancel_url: `${origin}/billing?state=canceled`,
      metadata: { clinician_id: clinician.id, plan: body.plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json({ error: "Could not start checkout. Please retry." }, { status: 500 });
  }
}
