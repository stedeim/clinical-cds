// In-memory store for uploaded patient-history documents (stub mode).
//
// Same seam as the other stub stores: globalThis-anchored Map, replaced by a
// Supabase table + storage bucket when the project connects (migration
// 0006_patient_documents.sql ships the table). Only extracted TEXT is kept —
// the original file bytes are parsed and discarded, so the store never holds
// binary blobs it can't search or display.

export interface PatientDocument {
  id: string;
  patientId: string;
  clinicianId: string;
  filename: string;
  format: "txt" | "docx" | "pdf";
  text: string; // extracted, capped
  // True when the text came from OCR of a scanned document — best-effort
  // recognition, labeled as such in the UI.
  ocr: boolean;
  uploadedAt: string;
}

export const MAX_TEXT_CHARS = 100_000;

const g = globalThis as unknown as { __pabaidPatientDocs?: Map<string, PatientDocument> };
const docs = (g.__pabaidPatientDocs ??= new Map<string, PatientDocument>());

export function createDocument(
  input: Omit<PatientDocument, "id" | "uploadedAt" | "text"> & { text: string },
): PatientDocument {
  const doc: PatientDocument = {
    ...input,
    text: input.text.slice(0, MAX_TEXT_CHARS),
    id: crypto.randomUUID(),
    uploadedAt: new Date().toISOString(),
  };
  docs.set(doc.id, doc);
  return doc;
}

export function listDocuments(patientId: string, clinicianId: string): PatientDocument[] {
  return [...docs.values()]
    .filter((d) => d.patientId === patientId && d.clinicianId === clinicianId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

// Test-only reset.
export function _resetPatientDocs(): void {
  docs.clear();
}
