// Domain types shared across the data layer, engine, and UI.
// These mirror the SQL schema in supabase/migrations/0001_init.sql.

export interface CaseRecord extends CaseContext {
  updatedAt: string;
}

export type GuidelineFramework = "US" | "UK_NICE" | "CA" | "AU" | "NZ" | "IE" | "WHO";

export type Sex = "female" | "male" | "intersex" | "unknown";

export interface Patient {
  id: string;
  externalRef?: string; // opaque, clinician-defined; not mapped to identity here
  // Optional, clinician's choice: a display name for the chart. Leaving it
  // blank keeps the record pseudonymous (the original privacy default).
  displayName?: string;
  ageYears?: number;
  sex?: Sex;
  isTestCase: boolean;
}

export interface Problem {
  code?: string; // ICD-10 or null
  label: string;
}

export interface Medication {
  name: string;
  dose?: string;
  route?: string;
  frequency?: string;
}

export interface Allergy {
  substance: string;
  reaction?: string;
}

export interface Vital {
  name: string; // 'HR' | 'BP' | 'Temp' | 'SpO2' | 'RR'
  value: string;
  unit?: string;
}

export interface Lab {
  name: string; // 'Cr', 'WBC', ...
  value?: number;
  valueText?: string;
  unit?: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  occurredAt: string;
  chiefComplaint?: string;
  hpi?: string;
  problems: Problem[];
  medications: Medication[];
  allergies: Allergy[];
  vitals: Vital[];
  labs: Lab[];
}

// A fully assembled case: what the engine reasons over. Built server-side,
// transiently, from the rows above. Never persisted as one blob.
export interface CaseContext {
  patient: Patient;
  encounter: Encounter;
}
