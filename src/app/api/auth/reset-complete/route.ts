import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Password reset, step 2: the recovery link landed the user with a session
// (code exchanged on /auth/reset/confirm); set the new password on it.

export const runtime = "nodejs";

const Body = z.object({ password: z.string().min(8, "Password must be at least 8 characters.") });

export async function POST(req: Request) {
  const rl = await rateLimit(`reset-complete:${clientIp(req)}`, { max: 10, windowMs: 600_000, label: "reset-complete" });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.updateUser({ password: body.password });
  if (error) {
    return NextResponse.json(
      { error: "This reset link has expired — request a new one from the sign-in page." },
      { status: 400 },
    );
  }
  return NextResponse.json({ success: true });
}
