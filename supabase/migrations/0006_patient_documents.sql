-- Uploaded patient-history documents. Mirrors src/lib/history/store.ts.
--
-- Only EXTRACTED TEXT is stored — the original file bytes are parsed
-- server-side and discarded (no binary blobs the app can't search or
-- display). Documents belong to a patient and are owner-scoped to the
-- uploading clinician, with the same encounter-linkage integrity rule used
-- elsewhere: you can only attach documents to your own patients.

create table patient_documents (
  id            uuid primary key default gen_random_uuid(),
  clinician_id  uuid not null references clinicians (id) on delete cascade,
  patient_id    uuid not null references patients (id) on delete cascade,
  filename      text not null check (char_length(filename) <= 255),
  format        text not null check (format in ('txt', 'docx', 'pdf')),
  text          text not null check (char_length(text) <= 100000),
  uploaded_at   timestamptz not null default now()
);

create index on patient_documents (patient_id, uploaded_at desc);

alter table patient_documents enable row level security;

create policy patient_documents_owner on patient_documents
  for all
  using (clinician_id = auth.uid())
  with check (
    clinician_id = auth.uid()
    and exists (
      select 1 from patients p
      where p.id = patient_documents.patient_id and p.clinician_id = auth.uid()
    )
  );
