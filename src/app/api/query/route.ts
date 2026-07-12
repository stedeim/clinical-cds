import { NextResponse } from "next/server";
import { z } from "zod";
import { getCase } from "@/lib/store";
import { runCdsQuery, CdsContractError } from "@/lib/cds/engine";
import { recordAudit } from "@/lib/audit";
import { requireEntitledClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { composedRateLimit } from "@/lib/rate-limit";
import { SAMPLE_ENCOUNTER_ID } from "@/lib/sample-case";
import { FRAMEWORK_IDS } from "@/lib/guidelines";
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
  framework: z.enum(FRAMEWORK_IDS).optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // The public sample encounter (synthetic data, fixed id) skips the clinician
  // gate so visitors can see the engine work before signing up. Real cases —
  // anything with PHI — keep the full verified-clinician requirement.
  const isSample = body.encounterId === SAMPLE_ENCOUNTER_ID;
  let clinicianId = "sample-visitor";
  if (!isSample) {
    try {
      const userId = await currentUserIdFromCookies();
      const clinician = await requireEntitledClinician(userId);
      clinicianId = clinician.id;
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("[cds_query] auth error", err);
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }
  }

  // Per-user + per-IP composite: signed-in clinicians get their own bucket
  // (60/min); unauth sample-visitor path stays per-IP only. Whichever bucket
  // exhausts first wins.
  const rl = await composedRateLimit(req, {
    userIdentifier: isSample ? undefined : clinicianId,
    userConfig: isSample ? undefined : { max: 60, windowMs: 60_000, label: "query" },
    ipConfig: { max: 30, windowMs: 60_000, label: "query" },
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
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

    // No audit row for sample-mode visitors: audit_logs keys on a real
    // clinician id, and there is no PHI in the synthetic case to account for.
    if (!isSample) {
      await recordAudit({
        clinicianId,
        action: "cds_query",
        encounterId: body.encounterId,
        detail: { model, framework: body.framework ?? "US", questionLength: body.question.length },
      });
    }

    return NextResponse.json({ response, model });
  } catch (err) {
    // Audit the failed access AFTER auth has passed: clinicianId is a real
    // verified id, and a compliance trail wants to know when the engine
    // errored for a signed-in user. Sample-mode has no audit row (no PHI).
    if (!isSample) {
      await recordAudit({
        clinicianId,
        action: "cds_query",
        encounterId: body.encounterId,
        detail: {
          outcome: "error",
          errorType: err instanceof CdsContractError ? "contract" : "internal",
          framework: body.framework ?? "US",
          questionLength: body.question.length,
        },
      }).catch(() => {});
    }
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
