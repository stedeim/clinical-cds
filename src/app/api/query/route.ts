import { NextResponse } from "next/server";
import { z } from "zod";
import { getCase } from "@/lib/store";
import { runCdsQuery, CdsContractError } from "@/lib/cds/engine";
import { recordAudit } from "@/lib/audit";
import { requireVerifiedClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import type { GuidelineFramework } from "@/lib/types";

// CDS query endpoint. PHI stays server-side: the browser sends an encounter id +
// question, never the case payload. This route assembles the case, runs the
// guarded engine, writes the audit row, and returns the validated structured
// response. It is also the EHR-facing API seam (Moat 2): a future plug-in can
// POST a case + question and get the same JSON contract.
//
// Access control: queries require an authenticated, verified clinician. Stub mode
// (no Supabase env vars) lets a demo clinician through so the vertical slice
// remains runnable with zero keys.

export const runtime = "nodejs";

const Body = z.object({
  encounterId: z.string().min(1),
  question: z.string().min(3).max(2000),
  framework: z.enum(["US", "UK_NICE", "WHO"]).optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let clinicianId: string;
  try {
    const userId = await currentUserIdFromCookies();
    const clinician = await requireVerifiedClinician(userId);
    clinicianId = clinician.id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[cds_query] auth error", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  const record = await getCase(body.encounterId, clinicianId);
  if (!record) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  try {
    const { response, model } = await runCdsQuery({
      caseContext: { patient: record.patient, encounter: record.encounter },
      question: body.question,
      frameworkPref: body.framework as GuidelineFramework | undefined,
    });

    await recordAudit({
      clinicianId,
      action: "cds_query",
      encounterId: body.encounterId,
      detail: { model, framework: body.framework ?? "US", questionLength: body.question.length },
    });

    return NextResponse.json({ response, model });
  } catch (err) {
    if (err instanceof CdsContractError) {
      return NextResponse.json(
        { error: "The assistant returned an unusable response. Please retry." },
        { status: 502 },
      );
    }
    console.error("[cds_query] unexpected error", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
