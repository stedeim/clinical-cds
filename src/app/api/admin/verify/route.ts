import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentClinician, currentUserIdFromCookies } from "@/lib/clinician";
import { createServiceClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Admin verification decision: approve or reject a pending clinician after
// checking their license against the licensing body's public register.
// Every decision is audited with who decided and the stated basis.

export const runtime = "nodejs";

const Body = z.object({
  clinicianId: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
});

export async function POST(req: Request) {
  const rl = await rateLimit(`admin-verify:${clientIp(req)}`, { max: 60, windowMs: 600_000, label: "admin-verify" });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const me = await getCurrentClinician(await currentUserIdFromCookies());
  if (!me || me.role !== "admin") {
    // 404, not 403: the admin surface shouldn't advertise its existence.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("clinicians")
      .update({ verification_status: body.decision })
      .eq("id", body.clinicianId)
      .select("full_name")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Clinician not found." }, { status: 404 });
    }

    await recordAudit({
      clinicianId: me.id,
      action: "verification_check",
      detail: {
        verdict: body.decision,
        reason: "Manual review by admin against the licensing body's public register.",
        subjectClinicianId: body.clinicianId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/verify]", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
