// Database row type definitions that mirror supabase/migrations/0001_init.sql.
// These are intentionally hand-written so the project builds without needing the
// Supabase CLI or generated types. When a real Supabase project is provisioned,
// you can replace these with generated types from `supabase gen types`.

export type VerificationStatus = "pending" | "verified" | "rejected";
export type ClinicianRole = "clinician" | "admin";

export interface DbClinician {
  id: string;
  full_name: string;
  credential: string;
  specialty: string | null;
  country: string;
  npi: string | null;
  verification_status: VerificationStatus;
  primary_framework: GuidelineFramework;
  is_beta: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "none" | "trialing" | "active" | "past_due" | "canceled";
  subscription_plan: "solo" | "clinic" | null;
  current_period_end: string | null;
  role: ClinicianRole;
  created_at: string;
}

export interface DbPatient {
  id: string;
  clinician_id: string;
  external_ref: string | null;
  display_name: string | null;
  age_years: number | null;
  sex: "female" | "male" | "intersex" | "unknown" | null;
  is_test_case: boolean;
  created_at: string;
}

export interface DbEncounter {
  id: string;
  clinician_id: string;
  patient_id: string;
  occurred_at: string;
  chief_complaint: string | null;
  hpi: string | null;
  created_at: string;
}

export interface DbProblem {
  id: string;
  encounter_id: string;
  code: string | null;
  label: string;
}

export interface DbMedication {
  id: string;
  encounter_id: string;
  name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
}

export interface DbAllergy {
  id: string;
  encounter_id: string;
  substance: string;
  reaction: string | null;
}

export interface DbVital {
  id: string;
  encounter_id: string;
  name: string;
  value: string;
  unit: string | null;
}

export interface DbLab {
  id: string;
  encounter_id: string;
  name: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
}

export interface DbQuery {
  id: string;
  clinician_id: string;
  encounter_id: string;
  question: string;
  framework: GuidelineFramework;
  model: string | null;
  response: unknown;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  clinician_id: string;
  encounter_id: string | null;
  query_id: string | null;
  action: string;
  detail: unknown;
  created_at: string;
}

import type { GuidelineFramework } from "../types";
