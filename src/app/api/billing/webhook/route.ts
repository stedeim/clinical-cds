import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, subscriptionToRow } from "@/lib/billing/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// Stripe → database mirror. Signature-verified; unsigned or mis-signed
// payloads are rejected before parsing. The handler is idempotent: every
// event type we care about resolves to "write the subscription's current
// state onto its clinician row", so replays and out-of-order delivery
// converge on the truth.

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 501 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[billing/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const clinicianId = sub.metadata?.clinician_id;
        const admin = createServiceClient();
        const row = subscriptionToRow(sub as unknown as Parameters<typeof subscriptionToRow>[0]);

        // Prefer the metadata linkage (set at checkout); fall back to the
        // customer id for subscriptions created outside our flow.
        const query = admin.from("clinicians").update(row);
        const { error } = clinicianId
          ? await query.eq("id", clinicianId)
          : await query.eq("stripe_customer_id", String(sub.customer));
        if (error) {
          console.error("[billing/webhook] clinician update failed:", error.message);
          // 500 → Stripe retries; the write is idempotent.
          return NextResponse.json({ error: "Database update failed." }, { status: 500 });
        }
        break;
      }
      default:
        // Unhandled event types are acknowledged, not errored — we only
        // subscribe to what we mirror.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[billing/webhook]", err);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
