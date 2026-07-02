import type { CaseContext, GuidelineFramework } from "../types";
import { matchDoseRule } from "../dosecheck/rules";
import { getServiceClientIfConfigured } from "../store";

// Record de-identified prescribing events — the write side of the future
// peer-stats loop ("X% of doctors in Texas prescribe …").
//
// De-identification happens HERE, before anything leaves the process: only
// (region, condition code/label, normalized ingredient, month) is written.
// No clinician id, no patient id, no encounter id, no dose. The table's
// schema (0005) enforces the same shape, and RLS deny-all keeps rows
// service-role-only; the app will read AGGREGATES, never rows.
//
// Stub mode (no Supabase): a silent no-op returning 0 — nothing is collected
// during local demos.

export interface RecordArgs {
  caseContext: CaseContext;
  framework: GuidelineFramework;
  // Coarse region code, e.g. "US", "US-TX", "GB-ENG". Country-level from the
  // framework by default; edge subregion headers can refine it later.
  region?: string;
}

export async function recordPrescribingEvents(args: RecordArgs): Promise<number> {
  const client = getServiceClientIfConfigured();
  if (!client) return 0; // stub mode — collect nothing locally

  const { encounter } = args.caseContext;
  if (encounter.problems.length === 0 || encounter.medications.length === 0) return 0;

  const region = args.region ?? args.framework;
  const month = new Date();
  const occurredMonth = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-01`;

  // One event per (problem, medication) pair — the aggregate layer decides
  // relevance; the raw layer stays dumb and uniform.
  const rows = encounter.problems.flatMap((problem) =>
    encounter.medications.map((med) => ({
      region,
      condition_code: problem.code ?? null,
      condition_label: problem.label.slice(0, 120),
      medication_ingredient: (matchDoseRule(med.name)?.ingredient ?? med.name.toLowerCase()).slice(0, 80),
      occurred_month: occurredMonth,
    })),
  );

  const { error } = await client.from("prescribing_events").insert(rows);
  if (error) {
    // Never fail the clinical request because analytics lagged; be loud in logs.
    console.error("[regional] failed to record prescribing events:", error.message);
    return 0;
  }
  return rows.length;
}
