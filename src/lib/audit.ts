// Audit trail (compliance requirement).
//
// Every CDS query event is recorded with who/when/which-case. In stub mode this
// logs to the server console; with Supabase configured, the same call inserts an
// append-only `audit_logs` row via the service role. No PHI is written here
// beyond the case-id linkage — this is the trail, not a second copy of the data.

import { createServiceClient, MissingSupabaseConfigError } from "./supabase/server";
import type { DbAuditLog } from "./db/types";

export interface AuditEvent {
  clinicianId: string;
  action: "cds_query" | "export_note" | "login";
  encounterId?: string;
  queryId?: string;
  detail?: Record<string, unknown>;
}

export async function recordAudit(event: AuditEvent): Promise<void> {
  const row: Omit<DbAuditLog, "id" | "created_at"> = {
    clinician_id: event.clinicianId,
    encounter_id: event.encounterId ?? null,
    query_id: event.queryId ?? null,
    action: event.action,
    detail: event.detail ?? null,
  };

  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const admin = createServiceClient();
      const { error } = await admin.from("audit_logs").insert(row);
      if (error) {
        // Never fail the user request because of audit write lag/failure, but be
        // loud in logs so ops notices.
        console.error("[audit] failed to write audit_log:", error.message);
      }
    } catch (err) {
      if (err instanceof MissingSupabaseConfigError) {
        console.error("[audit] supabase config error:", err.message);
      } else {
        console.error("[audit] unexpected error:", err);
      }
    }
  }

  // Stub path: structured server-side log. Never contains PHI.
  console.info("[audit]", JSON.stringify({ ...event, createdAt: new Date().toISOString() }));
}
