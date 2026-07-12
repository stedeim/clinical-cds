import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Brake on credential brute force / stuffing. Tighter than the compute
  // routes: 5 attempts / 10 min per IP is enough headroom for a legitimate
  // user retrying a typo, and far below what a stuffing script needs.
  const rl = await rateLimit(`login:${clientIp(req)}`, { max: 5, windowMs: 600_000, label: "login" });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message ?? "Sign in failed." }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
