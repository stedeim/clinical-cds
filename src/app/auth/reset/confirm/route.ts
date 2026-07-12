import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createUserClient } from "@/lib/supabase/server";

// Password reset link handler. Supabase's recovery email lands here with
// either a PKCE ?code= or a ?token_hash=&type= pair depending on template
// vintage — accept both, establish the session (cookies), and hand off to
// the set-new-password page. Any failure returns to the request page with
// an honest "expired" note instead of a dead end.

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "recovery") as EmailOtpType;

  const supabase = await createUserClient();
  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL("/auth/reset/set", url.origin));
    } else if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(new URL("/auth/reset/set", url.origin));
    }
  } catch (err) {
    console.error("[auth/reset/confirm]", err);
  }
  return NextResponse.redirect(new URL("/auth/reset?err=1", url.origin));
}
