import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Waitlist signup. No account, no PHI — an email and optional role. Idempotent
// on email (re-submitting is a friendly no-op, never a duplicate or an error
// that leaks whether the address is already listed). Degrades to a success
// response when Supabase isn't configured, so the page works in dev.

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  role: z.string().trim().max(120).optional(),
});

export async function POST(req: Request) {
  const rl = await rateLimit(`waitlist:${clientIp(req)}`, { max: 8, windowMs: 600_000, label: "waitlist" });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ success: true }); // dev/stub
  }

  try {
    const admin = createServiceClient();
    // upsert on the unique email — second submit just refreshes the row.
    const { error } = await admin
      .from("waitlist")
      .upsert(
        { email: body.email.toLowerCase(), role: body.role || null, source: "beta-landing" },
        { onConflict: "email" },
      );
    if (error) {
      console.error("[waitlist] insert failed:", error.message);
      return NextResponse.json({ error: "Something went wrong — try again." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
