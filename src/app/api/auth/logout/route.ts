import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth/logout]", error.message);
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
