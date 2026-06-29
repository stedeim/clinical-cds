import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return NextResponse.json({ user: user ? { id: user.id, email: user.email } : null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
