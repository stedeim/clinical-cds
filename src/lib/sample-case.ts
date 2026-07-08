import type { CaseRecord } from "./types";

// The public sample encounter — SYNTHETIC data only, no real patient behind it.
// It exists so a clinician can see Pabaid working before creating an account
// (value before the signup wall). The chart is deliberately staged so every
// safety moat fires at once:
//   • Lisinopril 200 mg  → dose flag (cited ceiling) + FDA boxed-warning badge
//   • Amoxicillin        → conflict with the recorded penicillin allergy
//   • Hypertension (I10) → guideline card, regional patterns, patient handout
// It resolves through the same getCase() path as real cases in every mode, is
// never listed among a clinician's own cases, and its API access skips the
// clinician gate ONLY for this fixed id (see /api/query, /api/note, /api/summary).

export const SAMPLE_ENCOUNTER_ID = "sample-encounter-1";

export const sampleCase: CaseRecord = {
  patient: {
    id: "sample-patient-1",
    externalRef: "SAMPLE-01",
    displayName: "Margaret Chen",
    ageYears: 58,
    sex: "female",
    isTestCase: true,
  },
  encounter: {
    id: SAMPLE_ENCOUNTER_ID,
    patientId: "sample-patient-1",
    occurredAt: "2026-07-01T09:30:00.000Z",
    chiefComplaint: "Hypertension follow-up; morning headaches",
    hpi:
      "58F. Home BP readings in the 150s/90s over the past two weeks, with morning " +
      "headaches. New right-knee pain for ~3 weeks, worse going up stairs; denies " +
      "trauma or swelling. Recheck potassium and creatinine in 2 weeks.",
    problems: [
      { code: "I10", label: "Essential (primary) hypertension" },
      { code: "M25.561", label: "Right knee pain, likely osteoarthritis" },
    ],
    medications: [
      { name: "Lisinopril", dose: "200 mg", route: "PO", frequency: "daily" },
      { name: "Amoxicillin", dose: "500 mg", route: "PO", frequency: "TID" },
    ],
    allergies: [{ substance: "penicillin", reaction: "hives" }],
    vitals: [
      { name: "BP", value: "152/94", unit: "mmHg" },
      { name: "HR", value: "78", unit: "bpm" },
    ],
    labs: [],
  },
  updatedAt: "2026-07-01T09:30:00.000Z",
};
