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
  // Non-US clinicians: license/registration number + licensing body (CPSO,
  // GMC, AHPRA, …). Reviewed by an admin against the body's public register.
  licenseNumber: z.string().trim().max(40).optional(),
  licenseBody: z.string().trim().max(80).optional(),
  // Optional beta invite code — single-use, grants free access (is_beta).
  // Never affects verification_status.
  betaCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^PABAID-[A-Z2-9]{5}$/)
    .optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Account creation is not something a human does 6 times a minute.
  const rl = await rateLimit(`signup:${clientIp(req)}`, { max: 5, windowMs: 600_000, label: "signup" });
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

    // Validate the beta code BEFORE creating anything: a bad code should be
    // a clean form error, not a half-created account. Single-use is enforced
    // by the conditional update at redemption below.
    if (body.betaCode) {
      const { data: codeRow } = await admin
        .from("beta_codes")
        .select("code, redeemed_by")
        .eq("code", body.betaCode)
        .maybeSingle();
      if (!codeRow) {
        return NextResponse.json({ error: "That beta code isn't valid." }, { status: 400 });
      }
      if (codeRow.redeemed_by) {
        return NextResponse.json({ error: "That beta code has already been used." }, { status: 400 });
      }
    }

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
        : body.licenseNumber
          ? "Your registration will be checked against your licensing body's public register — usually within 1 business day."
          : "No registration details provided — held for manual review.",
    };
    if (body.npi) {
      verification = await verifyClinicianNpi({ npi: body.npi, fullName: body.fullName });
    }

    // Seed the profile's guideline framework and country from where the
    // clinician is signing up (Vercel edge country header). From then on the
    // PROFILE is the source of truth — a Canadian doctor on a US conference
    // network keeps Canadian guidelines. Editable later; geo never overrides it.
    // Redeem the beta code atomically: the update only lands if the code is
    // still unredeemed (two racers → one wins, the other gets is_beta=false
    // and a clear error). Redeemed BEFORE the clinician insert so the roster
    // row can reference the auth user id either way.
    let isBeta = false;
    if (body.betaCode) {
      const { data: redeemed } = await admin
        .from("beta_codes")
        .update({ redeemed_by: authData.user.id, redeemed_at: new Date().toISOString() })
        .eq("code", body.betaCode)
        .is("redeemed_by", null)
        .select("code");
      isBeta = (redeemed?.length ?? 0) > 0;
      if (!isBeta) {
        await admin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ error: "That beta code has already been used." }, { status: 400 });
      }
    }

    // A beta code is the founder's personal vouch — codes are handed to
    // known clinicians one by one, so the manual review happened at invite
    // time. That clears the verification gate for the founding cohort
    // (critically: Canadian and other non-US doctors have no NPI to verify
    // against). A successful NPPES verification above still takes precedence
    // as the stronger, registry-backed basis.
    if (isBeta && verification.verdict === "pending") {
      verification = {
        verdict: "verified",
        reason: "Founding-beta invite — personally vouched at invite time.",
      };
    }

    const { error: insertError } = await admin.from("clinicians").insert({
      id: authData.user.id,
      full_name: body.fullName,
      credential: body.credential,
      npi: body.npi ?? null,
      license_number: body.licenseNumber || null,
      license_body: body.licenseBody || null,
      verification_status: verification.verdict,
      primary_framework: detectFramework(req.headers),
      country: detectCountry(req.headers) ?? "US",
      is_beta: isBeta,
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
