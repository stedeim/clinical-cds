import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  credential: z.string().min(1),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
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
      // Rollback user creation is best-effort; log and surface failure.
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/signup]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
