import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyClinicianNpi } from "@/lib/verification/npi";
import { detectCountry, detectFramework } from "@/lib/geo";
import { recordAudit } from "@/lib/audit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  credential: z.string().min(1),
  // Optional US NPI — enables instant verification against the NPPES
  // registry. Absent (or non-US) → account stays pending for manual review.
  npi: z.string().regex(/^\d{10}$/).optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Account creation is not something a human does 6 times a minute.
  const rl = rateLimit(`signup:${clientIp(req)}`, { limit: 5, windowMs: 600_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Please wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { data: authData, error: signUpError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (signUpError || !authData.user) {
      return NextResponse.json({ error: signUpError?.message ?? "Sign up failed." }, { status: 400 });
    }

    // Real verification, not a database flag: with an NPI, check the NPPES
    // registry inline (~200 ms; every failure mode degrades to "pending" for
    // manual review — auto-verification only ever says yes).
    let verification: { verdict: "verified" | "pending"; reason: string } = {
      verdict: "pending",
      reason: body.npi
        ? "Verification in progress."
        : "No NPI provided — held for manual review (non-US clinicians are reviewed manually).",
    };
    if (body.npi) {
      verification = await verifyClinicianNpi({ npi: body.npi, fullName: body.fullName });
    }

    // Seed the profile's guideline framework and country from where the
    // clinician is signing up (Vercel edge country header). From then on the
    // PROFILE is the source of truth — a Canadian doctor on a US conference
    // network keeps Canadian guidelines. Editable later; geo never overrides it.
    const { error: insertError } = await admin.from("clinicians").insert({
      id: authData.user.id,
      full_name: body.fullName,
      credential: body.credential,
      npi: body.npi ?? null,
      verification_status: verification.verdict,
      primary_framework: detectFramework(req.headers),
      country: detectCountry(req.headers) ?? "US",
    });

    if (insertError) {
      // Rollback user creation is best-effort; log the detail server-side but
      // never surface raw DB internals to the browser.
      console.error("[auth/signup] clinician insert failed:", insertError.message);
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Sign up failed. Please try again." }, { status: 500 });
    }

    // The verification outcome is compliance-relevant — audit it with the
    // decision basis (reason), never the raw registry payload.
    await recordAudit({
      clinicianId: authData.user.id,
      action: "verification_check",
      detail: { verdict: verification.verdict, reason: verification.reason, npiProvided: !!body.npi },
    });

    return NextResponse.json({
      success: true,
      verification: { status: verification.verdict, reason: verification.reason },
    });
  } catch (err) {
    console.error("[auth/signup]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
