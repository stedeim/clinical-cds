import { NextResponse } from "next/server";
import { requireVerifiedClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { getStripe, isBillingConfigured } from "@/lib/billing/stripe";

// Stripe billing portal: update card, switch plan, cancel — all on Stripe's
// hosted page. Cancellation stays one click away by design; an exit door
// that's easy to find is part of the trust story.

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
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

  if (!clinician.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account yet." }, { status: 400 });
  }

  try {
    const origin = req.headers.get("origin") ?? "https://pabaid.com";
    const session = await getStripe().billingPortal.sessions.create({
      customer: clinician.stripeCustomerId,
      return_url: `${origin}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/portal]", err);
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 500 });
  }
}
