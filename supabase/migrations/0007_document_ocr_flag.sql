-- Track whether a history document's text came from OCR of a scanned file
-- (best-effort recognition) rather than a real text layer — the UI labels
-- OCR text so it is never passed off as ground truth. Mirrors
-- PatientDocument.ocr in src/lib/history/store.ts.

alter table patient_documents
  add column ocr boolean not null default false;
