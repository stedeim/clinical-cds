import type { SupabaseClient } from "../supabase/server";
import type {
  DbAllergy,
  DbEncounter,
  DbLab,
  DbMedication,
  DbPatient,
  DbProblem,
  DbVital,
} from "./types";
import type { CaseRecord, Allergy, Encounter, Lab, Medication, Patient, Problem, Sex, Vital } from "../types";

// Highest-level Supabase-backed store functions. These map rows from the SQL
// schema into the CaseRecord type used by the rest of the app.

export async function listCasesFromDb(supabase: SupabaseClient): Promise<CaseRecord[]> {
  const { data: encounters, error } = await supabase
    .from("encounters")
    .select(
      `
      id,
      clinician_id,
      patient_id,
      occurred_at,
      chief_complaint,
      hpi,
      created_at,
      patients!inner (
        id,
        clinician_id,
        external_ref,
        age_years,
        sex,
        is_test_case,
        created_at
      )
    `,
    )
    .order("occurred_at", { ascending: false });

  if (error) throw mapDbError(error);
  if (!encounters) return [];

  const rows = encounters as unknown as Array<DbEncounter & { patients: DbPatient }>;

  const caseRecords = await Promise.all(
    rows.map(async (row) => {
      const [problems, medications, allergies, vitals, labs] = await Promise.all([
        fetchChildRows<DbProblem>(supabase, "problems", row.id),
        fetchChildRows<DbMedication>(supabase, "medications", row.id),
        fetchChildRows<DbAllergy>(supabase, "allergies", row.id),
        fetchChildRows<DbVital>(supabase, "vitals", row.id),
        fetchChildRows<DbLab>(supabase, "labs", row.id),
      ]);

      return assembleCaseRecord({
        patientRow: row.patients,
        encounterRow: row,
        problems,
        medications,
        allergies,
        vitals,
        labs,
      });
    }),
  );

  return caseRecords;
}

export async function getCaseFromDb(
  supabase: SupabaseClient,
  encounterId: string,
): Promise<CaseRecord | undefined> {
  const { data: encounter, error } = await supabase
    .from("encounters")
    .select(
      `
      id,
      clinician_id,
      patient_id,
      occurred_at,
      chief_complaint,
      hpi,
      created_at,
      patients!inner (
        id,
        clinician_id,
        external_ref,
        age_years,
        sex,
        is_test_case,
        created_at
      )
    `,
    )
    .eq("id", encounterId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return undefined; // not found
    throw mapDbError(error);
  }
  if (!encounter) return undefined;

  const row = encounter as unknown as DbEncounter & { patients: DbPatient };

  const [problems, medications, allergies, vitals, labs] = await Promise.all([
    fetchChildRows<DbProblem>(supabase, "problems", row.id),
    fetchChildRows<DbMedication>(supabase, "medications", row.id),
    fetchChildRows<DbAllergy>(supabase, "allergies", row.id),
    fetchChildRows<DbVital>(supabase, "vitals", row.id),
    fetchChildRows<DbLab>(supabase, "labs", row.id),
  ]);

  return assembleCaseRecord({
    patientRow: row.patients,
    encounterRow: row,
    problems,
    medications,
    allergies,
    vitals,
    labs,
  });
}

export async function saveCaseToDb(
  supabase: SupabaseClient,
  clinicianId: string,
  record: CaseRecord,
): Promise<CaseRecord> {
  const { patient, encounter } = record;

  // Upsert patient.
  const { data: patientRow, error: patientError } = await supabase
    .from("patients")
    .upsert(
      {
        id: patient.id.startsWith("demo-") ? undefined : patient.id,
        clinician_id: clinicianId,
        external_ref: patient.externalRef ?? null,
        age_years: patient.ageYears ?? null,
        sex: patient.sex ?? "unknown",
        is_test_case: patient.isTestCase,
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (patientError) throw mapDbError(patientError);

  // Upsert encounter.
  const { data: encounterRow, error: encounterError } = await supabase
    .from("encounters")
    .upsert(
      {
        id: encounter.id.startsWith("demo-") ? undefined : encounter.id,
        clinician_id: clinicianId,
        patient_id: patientRow.id,
        occurred_at: encounter.occurredAt,
        chief_complaint: encounter.chiefComplaint ?? null,
        hpi: encounter.hpi ?? null,
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (encounterError) throw mapDbError(encounterError);

  // Replace child rows for the encounter.
  const encounterId = encounterRow.id;
  await Promise.all([
    replaceChildRows(
      supabase,
      "problems",
      encounterId,
      encounter.problems.map((p: Problem) => ({
        encounter_id: encounterId,
        code: p.code ?? null,
        label: p.label,
      })),
    ),
    replaceChildRows(
      supabase,
      "medications",
      encounterId,
      encounter.medications.map((m: Medication) => ({
        encounter_id: encounterId,
        name: m.name,
        dose: m.dose ?? null,
        route: m.route ?? null,
        frequency: m.frequency ?? null,
      })),
    ),
    replaceChildRows(
      supabase,
      "allergies",
      encounterId,
      encounter.allergies.map((a: Allergy) => ({
        encounter_id: encounterId,
        substance: a.substance,
        reaction: a.reaction ?? null,
      })),
    ),
    replaceChildRows(
      supabase,
      "vitals",
      encounterId,
      encounter.vitals.map((v: Vital) => ({
        encounter_id: encounterId,
        name: v.name,
        value: v.value,
        unit: v.unit ?? null,
      })),
    ),
    replaceChildRows(
      supabase,
      "labs",
      encounterId,
      encounter.labs.map((l: Lab) => ({
        encounter_id: encounterId,
        name: l.name,
        value: l.value ?? null,
        value_text: l.valueText ?? null,
        unit: l.unit ?? null,
      })),
    ),
  ]);

  const savedPatient: Patient = {
    id: patientRow.id,
    externalRef: patientRow.external_ref ?? undefined,
    ageYears: patientRow.age_years ?? undefined,
    sex: (patientRow.sex as Sex | null) ?? "unknown",
    isTestCase: patientRow.is_test_case,
  };

  const savedEncounter: Encounter = {
    id: encounterRow.id,
    patientId: savedPatient.id,
    occurredAt: encounterRow.occurred_at,
    chiefComplaint: encounterRow.chief_complaint ?? undefined,
    hpi: encounterRow.hpi ?? undefined,
    problems: encounter.problems,
    medications: encounter.medications,
    allergies: encounter.allergies,
    vitals: encounter.vitals,
    labs: (encounter.labs as DbLab[]).map((l) => toLabFromDb(l)),
  };

  return {
    patient: savedPatient,
    encounter: savedEncounter,
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchChildRows<T>(
  supabase: SupabaseClient,
  table: string,
  encounterId: string,
): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*").eq("encounter_id", encounterId);
  if (error) throw mapDbError(error);
  return (data as T[]) ?? [];
}

async function replaceChildRows<T extends { encounter_id: string }>(
  supabase: SupabaseClient,
  table: string,
  encounterId: string,
  rows: T[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("encounter_id", encounterId);
  if (deleteError) throw mapDbError(deleteError);

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from(table).insert(rows as unknown[]);
    if (insertError) throw mapDbError(insertError);
  }
}

function assembleCaseRecord(args: {
  patientRow: DbPatient;
  encounterRow: DbEncounter;
  problems: DbProblem[];
  medications: DbMedication[];
  allergies: DbAllergy[];
  vitals: DbVital[];
  labs: DbLab[];
}): CaseRecord {
  const { patientRow, encounterRow, problems, medications, allergies, vitals, labs } = args;
  return {
    patient: {
      id: patientRow.id,
      externalRef: patientRow.external_ref ?? undefined,
      ageYears: patientRow.age_years ?? undefined,
      sex: (patientRow.sex as Sex | null) ?? undefined,
      isTestCase: patientRow.is_test_case,
    },
    encounter: {
      id: encounterRow.id,
      patientId: patientRow.id,
      occurredAt: encounterRow.occurred_at,
      chiefComplaint: encounterRow.chief_complaint ?? undefined,
      hpi: encounterRow.hpi ?? undefined,
      problems: problems.map((p: DbProblem) => ({ code: p.code ?? undefined, label: p.label })),
      medications: medications.map((m: DbMedication) => ({
        name: m.name,
        dose: m.dose ?? undefined,
        route: m.route ?? undefined,
        frequency: m.frequency ?? undefined,
      })),
      allergies: allergies.map((a: DbAllergy) => ({
        substance: a.substance,
        reaction: a.reaction ?? undefined,
      })),
      vitals: vitals.map((v: DbVital) => ({ name: v.name, value: v.value, unit: v.unit ?? undefined })),
      labs: labs.map(toLabFromDb),
    },
    updatedAt: encounterRow.occurred_at,
  };
}

function toLabFromDb(row: DbLab): Lab {
  if (row.value_text !== null && row.value_text !== undefined) {
    return { name: row.name, valueText: row.value_text, unit: row.unit ?? undefined };
  }
  return {
    name: row.name,
    value: row.value ?? undefined,
    valueText: row.value_text ?? undefined,
    unit: row.unit ?? undefined,
  };
}

export function mapDbError(error: { message: string; code?: string }): Error {
  return new Error(`Database error (${error.code ?? "unknown"}): ${error.message}`);
}
