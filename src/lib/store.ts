// Unified store: uses Supabase when configured, otherwise falls back to the
// in-memory seeded demo store. This keeps `npm run dev` working with zero keys
// while making production simply a matter of setting Supabase env vars.

import type { CaseContext, CaseRecord } from "./types";
import * as memoryStore from "./memory-store";
import * as dbCases from "./db/cases";
import { createServiceClient, MissingSupabaseConfigError } from "./supabase/server";
import { SAMPLE_ENCOUNTER_ID, sampleCase } from "./sample-case";

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getServiceClientIfConfigured() {
  if (isSupabaseConfigured()) {
    return createServiceClient();
  }
  return null;
}

// If Supabase is not configured, we use the in-memory stub. When Supabase IS
// configured, the Server Component / Route Handler must also provide a
// clinicianId from the session. In stub mode that id is ignored.

export async function listCases(clinicianId?: string): Promise<CaseRecord[]> {
  if (isSupabaseConfigured()) {
    if (!clinicianId) {
      throw new Error("clinicianId is required when Supabase is configured.");
    }
    const client = getServiceClientIfConfigured();
    if (!client) throw new MissingSupabaseConfigError("Supabase service client unavailable.");
    return dbCases.listCasesFromDb(client);
  }
  return memoryStore.listCases();
}

export async function getCase(
  encounterId: string,
  clinicianId?: string,
): Promise<CaseRecord | undefined> {
  // The public sample encounter resolves for everyone in every mode —
  // synthetic data, read through the same path as real cases.
  if (encounterId === SAMPLE_ENCOUNTER_ID) return sampleCase;
  if (isSupabaseConfigured()) {
    if (!clinicianId) {
      throw new Error("clinicianId is required when Supabase is configured.");
    }
    const client = getServiceClientIfConfigured();
    if (!client) throw new MissingSupabaseConfigError("Supabase service client unavailable.");
    return dbCases.getCaseFromDb(client, encounterId);
  }
  return memoryStore.getCase(encounterId);
}

export async function saveCase(
  record: CaseContext,
  clinicianId?: string,
): Promise<CaseRecord> {
  if (isSupabaseConfigured()) {
    if (!clinicianId) {
      throw new Error("clinicianId is required when Supabase is configured.");
    }
    const client = getServiceClientIfConfigured();
    if (!client) throw new MissingSupabaseConfigError("Supabase service client unavailable.");
    const fullRecord: CaseRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    return dbCases.saveCaseToDb(client, clinicianId, fullRecord);
  }
  return memoryStore.saveCase(record);
}

// A patient's prior visits (excluding the current one), most recent first.
// Stub mode: keyed by the external-ref continuity in memory-store. Supabase
// mode: returns [] until db/cases grows a patient-history query — an honest
// gap, not a fake history.
export async function getPatientHistory(
  patientId: string,
  excludeEncounterId: string,
): Promise<CaseRecord[]> {
  if (isSupabaseConfigured()) return [];
  return memoryStore.listCasesForPatient(patientId, excludeEncounterId);
}
