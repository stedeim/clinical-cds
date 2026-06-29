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

const cases = new Map<string, CaseRecord>([
  [
    seedEncounter.id,
    {
      patient: seedPatient,
      encounter: seedEncounter,
      updatedAt: seedEncounter.occurredAt,
    },
  ],
]);

export function listCases(): CaseRecord[] {
  return [...cases.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCase(encounterId: string): CaseRecord | undefined {
  return cases.get(encounterId);
}

export function saveCase(record: CaseContext): CaseRecord {
  const stored: CaseRecord = { ...record, updatedAt: new Date().toISOString() };
  cases.set(record.encounter.id, stored);
  return stored;
}
