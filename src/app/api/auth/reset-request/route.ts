import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Password reset, step 1: email a recovery link. ALWAYS returns success —
// whether or not the address has an account — so this endpoint can't be
// used to probe which emails exist.

export const runtime = "nodejs";

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const rl = await rateLimit(`reset:${clientIp(req)}`, { max: 5, windowMs: 600_000, label: "reset" });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many reset requests. Please wait a few minutes." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const origin = req.headers.get("origin") ?? "https://pabaid.com";
    const supabase = await createUserClient();
    await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${origin}/auth/reset/confirm`,
    });
  } catch (err) {
    // Log, but never leak the failure mode to the caller.
    console.error("[auth/reset-request]", err);
  }

  return NextResponse.json({ success: true });
}
