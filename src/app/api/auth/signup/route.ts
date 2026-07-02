import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  credential: z.string().min(1),
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

    const { error: insertError } = await admin.from("clinicians").insert({
      id: authData.user.id,
      full_name: body.fullName,
      credential: body.credential,
      verification_status: "pending",
    });

    if (insertError) {
      // Rollback user creation is best-effort; log the detail server-side but
      // never surface raw DB internals to the browser.
      console.error("[auth/signup] clinician insert failed:", insertError.message);
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Sign up failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/signup]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
