import { NextResponse } from "next/server";
import { z } from "zod";
import { getCase } from "@/lib/store";
import { addAllergy } from "@/lib/memory-store";
import { recordAudit } from "@/lib/audit";
import { requireEntitledClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Clinician-confirmed allergy addition — the confirm half of the document
// scan. Only a signed-in, verified clinician's explicit click lands here;
// the scan itself never writes. Standard posture: ownership check, rate
// limit, audited with the source document.

export const runtime = "nodejs";

const Body = z.object({
  encounterId: z.string().min(1),
  substance: z.string().min(2).max(120),
  sourceDocument: z.string().max(255).optional(),
});

export async function POST(req: Request) {
  const rl = await rateLimit(`allergies:${clientIp(req)}`, { max: 30, windowMs: 60_000, label: "allergies" });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let clinicianId: string;
  try {
    clinicianId = (await requireEntitledClinician(await currentUserIdFromCookies())).id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  const record = await getCase(body.encounterId, clinicianId);
  if (!record) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const updated = addAllergy(body.encounterId, body.substance);
  if (!updated) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  await recordAudit({
    clinicianId,
    action: "allergy_add",
    encounterId: body.encounterId,
    detail: { substance: body.substance, sourceDocument: body.sourceDocument ?? null },
  });

  return NextResponse.json({ allergies: updated.encounter.allergies });
}
