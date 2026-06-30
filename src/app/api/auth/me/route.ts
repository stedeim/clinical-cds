import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";

export const runtime = "nodejs";

export async function GET() {
  // getServerUser() centralizes the stub-mode decision: it returns the synthetic
  // demo user with no keys, or the real cookie-backed session when Supabase is set.
  const user = await getServerUser();
  return NextResponse.json({ user: user ? { id: user.id, email: user.email } : null });
}
