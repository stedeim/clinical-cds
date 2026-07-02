import type { CaseContext, Encounter, Patient } from "@/lib/types";

// Minimal, valid fixtures shared across specs. Deliberately tiny — each test
// overrides only the fields it exercises.

export function makePatient(over: Partial<Patient> = {}): Patient {
  return { id: "pat-1", isTestCase: true, ageYears: 54, sex: "female", ...over };
}

export function makeEncounter(over: Partial<Encounter> = {}): Encounter {
  return {
    id: "enc-1",
    patientId: "pat-1",
    occurredAt: "2026-01-01T00:00:00.000Z",
    chiefComplaint: "Follow-up hypertension",
    hpi: "BP well controlled on current regimen.",
    problems: [{ code: "I10", label: "Essential hypertension" }],
    medications: [{ name: "Lisinopril", dose: "10 mg", frequency: "daily" }],
    allergies: [],
    vitals: [{ name: "BP", value: "128/78", unit: "mmHg" }],
    labs: [{ name: "Cr", value: 0.9, unit: "mg/dL" }],
    ...over,
  };
}

export function makeCase(over: { patient?: Partial<Patient>; encounter?: Partial<Encounter> } = {}): CaseContext {
  return {
    patient: makePatient(over.patient),
    encounter: makeEncounter(over.encounter),
  };
}
