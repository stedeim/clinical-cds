import type { CaseContext, CaseRecord } from "./types";

// In-memory data layer for the vertical slice (stub mode).
//
// Swappable seam: when Supabase env vars are present, a real implementation of
// this same interface (RLS-scoped queries) replaces the in-memory map. The rest
// of the app depends only on getCase / listCases / saveCase, never on storage.

export type { CaseContext, CaseRecord };

const seedPatient: CaseContext["patient"] = {
  id: "demo-patient-1",
  externalRef: "DEMO-001",
  ageYears: 54,
  sex: "female",
  isTestCase: true,
};

const seedEncounter: CaseContext["encounter"] = {
  id: "demo-encounter-1",
  patientId: "demo-patient-1",
  occurredAt: new Date().toISOString(),
  chiefComplaint: "Persistent dry cough x 6 weeks and fatigue",
  hpi:
    "54F, never-smoker. Six weeks of non-productive cough and tiredness. No fever, " +
    "no weight loss, no hemoptysis. Started lisinopril ~2 months ago for hypertension.",
  problems: [{ code: "I10", label: "Essential hypertension" }],
  medications: [{ name: "Lisinopril", dose: "10 mg", route: "PO", frequency: "daily" }],
  allergies: [],
  vitals: [
    { name: "BP", value: "128/82", unit: "mmHg" },
    { name: "HR", value: "74", unit: "bpm" },
    { name: "SpO2", value: "98", unit: "%" },
    { name: "Temp", value: "36.8", unit: "C" },
  ],
  labs: [
    { name: "Cr", value: 0.9, unit: "mg/dL" },
    { name: "WBC", value: 6.2, unit: "10^3/uL" },
  ],
};

// Anchored on globalThis: in `next dev`, route handlers and server components
// can end up with separate instances of this module across recompiles, which
// would silently fork/reset a plain module-level Map (created cases 404ing on
// the very next page view). One process, one store; seeded once.
const g = globalThis as unknown as { __pabaidCases?: Map<string, CaseRecord> };
const cases = (g.__pabaidCases ??= new Map<string, CaseRecord>([
  [
    seedEncounter.id,
    {
      patient: seedPatient,
      encounter: seedEncounter,
      updatedAt: seedEncounter.occurredAt,
    },
  ],
]));

export function listCases(): CaseRecord[] {
  return [...cases.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCase(encounterId: string): CaseRecord | undefined {
  return cases.get(encounterId);
}

// Patient continuity: the clinician-chosen external ref is the returning-
// patient key. A new case whose ref matches an existing patient reuses that
// patient's id, so visit history and prior allergies attach automatically.
export function findPatientByRef(externalRef: string): CaseRecord["patient"] | undefined {
  const ref = externalRef.trim().toLowerCase();
  if (!ref) return undefined;
  for (const record of cases.values()) {
    if (record.patient.externalRef?.trim().toLowerCase() === ref) return record.patient;
  }
  return undefined;
}

// A patient's other visits, most recent first.
export function listCasesForPatient(patientId: string, excludeEncounterId?: string): CaseRecord[] {
  return [...cases.values()]
    .filter((r) => r.patient.id === patientId && r.encounter.id !== excludeEncounterId)
    .sort((a, b) => b.encounter.occurredAt.localeCompare(a.encounter.occurredAt));
}

// Clinician-confirmed allergy addition (the document-scan confirm flow).
// Appends to the encounter's allergy list; dedupes case-insensitively.
export function addAllergy(encounterId: string, substance: string): CaseRecord | undefined {
  const record = cases.get(encounterId);
  if (!record) return undefined;
  const exists = record.encounter.allergies.some(
    (a) => a.substance.toLowerCase() === substance.toLowerCase(),
  );
  if (!exists) {
    record.encounter.allergies.push({ substance });
    record.updatedAt = new Date().toISOString();
  }
  return record;
}

export function saveCase(record: CaseContext): CaseRecord {
  // Returning patient? Reuse the identity; keep the freshest demographics.
  const existing = record.patient.externalRef ? findPatientByRef(record.patient.externalRef) : undefined;
  const patient = existing ? { ...record.patient, id: existing.id } : record.patient;

  const stored: CaseRecord = {
    ...record,
    patient,
    encounter: { ...record.encounter, patientId: patient.id },
    updatedAt: new Date().toISOString(),
  };
  cases.set(record.encounter.id, stored);
  return stored;
}
