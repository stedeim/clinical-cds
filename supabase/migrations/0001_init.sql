-- Consilium — initial schema.
--
-- Design intent (regulatory + moat):
--   * PHI isolation: patient identity lives in `patients` (pseudonymized) and is
--     never duplicated into query/response rows. Models receive a transient,
--     server-built payload, not a stored bundle.
--   * Auditability: every CDS query writes an immutable `audit_logs` row
--     (who, when, which case, which framework). Append-only by policy.
--   * Least privilege: Row-Level Security scopes every row to its owning
--     clinician. A clinician can only ever see their own patients/encounters.
--   * Verified-clinician gate: `clinicians.verification_status` must be
--     'verified' before the app exposes CDS output (enforced in app + policy).
--
-- Supabase note: auth.users is managed by Supabase Auth. `clinicians.id`
-- is a 1:1 extension of an auth user. RLS uses auth.uid().

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Clinicians (the only user type — no patient accounts by design).
-- ---------------------------------------------------------------------------
create type verification_status as enum ('pending', 'verified', 'rejected');
create type clinician_role as enum ('clinician', 'admin');
create type guideline_framework as enum ('US', 'UK_NICE', 'WHO');

create table clinicians (
  id                   uuid primary key references auth.users (id) on delete cascade,
  full_name            text not null,
  credential           text not null,                 -- e.g. 'MD', 'DO', 'NP', 'PA'
  specialty            text,
  country              text not null default 'US',
  npi                  text,                           -- nullable; verified via stub registry
  verification_status  verification_status not null default 'pending',
  primary_framework    guideline_framework not null default 'US',
  role                 clinician_role not null default 'clinician',
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Patients — pseudonymized. No name/MRN/DOB. Only de-identified attributes
-- needed for reasoning. `external_ref` is an opaque token the clinician maps
-- back to their own EHR; we never store the mapping.
-- ---------------------------------------------------------------------------
create table patients (
  id            uuid primary key default gen_random_uuid(),
  clinician_id  uuid not null references clinicians (id) on delete cascade,
  external_ref  text,                                  -- opaque, clinician-defined
  age_years     int  check (age_years between 0 and 130),
  sex           text check (sex in ('female', 'male', 'intersex', 'unknown')),
  is_test_case  boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Encounters — one visit / question context for a patient.
-- ---------------------------------------------------------------------------
create table encounters (
  id              uuid primary key default gen_random_uuid(),
  clinician_id    uuid not null references clinicians (id) on delete cascade,
  patient_id      uuid not null references patients (id) on delete cascade,
  occurred_at     timestamptz not null default now(),
  chief_complaint text,
  hpi             text,                                -- free-text history
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Discrete clinical data. Each row ties to an encounter. Single lab VALUES
-- only (Non-Device CDS scope) — no waveforms, no images, no streams.
-- ---------------------------------------------------------------------------
create table problems (
  id            uuid primary key default gen_random_uuid(),
  encounter_id  uuid not null references encounters (id) on delete cascade,
  code          text,                                  -- ICD-10 or null
  label         text not null
);

create table medications (
  id            uuid primary key default gen_random_uuid(),
  encounter_id  uuid not null references encounters (id) on delete cascade,
  name          text not null,
  dose          text,
  route         text,
  frequency     text
);

create table allergies (
  id            uuid primary key default gen_random_uuid(),
  encounter_id  uuid not null references encounters (id) on delete cascade,
  substance     text not null,
  reaction      text
);

create table vitals (
  id            uuid primary key default gen_random_uuid(),
  encounter_id  uuid not null references encounters (id) on delete cascade,
  name          text not null,                         -- 'HR', 'BP', 'Temp', 'SpO2', 'RR'
  value         text not null,
  unit          text,
  measured_at   timestamptz
);

create table labs (
  id            uuid primary key default gen_random_uuid(),
  encounter_id  uuid not null references encounters (id) on delete cascade,
  name          text not null,                         -- 'Cr', 'WBC', 'Hb'
  value         numeric,
  value_text    text,                                  -- when non-numeric
  unit          text,
  measured_at   timestamptz
);

-- ---------------------------------------------------------------------------
-- Queries + responses. The structured CDS output is stored as JSONB so the
-- app can re-render it without re-calling the model. We store the framework
-- and the data-point references the model cited (explainability moat).
-- ---------------------------------------------------------------------------
create table queries (
  id             uuid primary key default gen_random_uuid(),
  clinician_id   uuid not null references clinicians (id) on delete cascade,
  encounter_id   uuid not null references encounters (id) on delete cascade,
  question       text not null,
  framework      guideline_framework not null,
  model          text,                                 -- model id, or 'mock'
  response       jsonb,                                -- structured CdsResponse
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit log — append-only. One row per CDS query event. No PHI in here beyond
-- the case id linkage; this is the compliance trail, not a data store.
-- ---------------------------------------------------------------------------
create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  clinician_id  uuid not null references clinicians (id) on delete cascade,
  encounter_id  uuid references encounters (id) on delete set null,
  query_id      uuid references queries (id) on delete set null,
  action        text not null,                         -- 'cds_query', 'export_note', 'login'
  detail        jsonb,
  created_at    timestamptz not null default now()
);

create index on patients (clinician_id);
create index on encounters (clinician_id, patient_id);
create index on queries (clinician_id, encounter_id);
create index on audit_logs (clinician_id, created_at desc);

-- ===========================================================================
-- Row-Level Security: every clinical row is scoped to its owning clinician.
-- ===========================================================================
alter table clinicians  enable row level security;
alter table patients    enable row level security;
alter table encounters  enable row level security;
alter table problems    enable row level security;
alter table medications enable row level security;
alter table allergies   enable row level security;
alter table vitals      enable row level security;
alter table labs        enable row level security;
alter table queries     enable row level security;
alter table audit_logs  enable row level security;

-- A clinician sees and edits only their own profile.
create policy clinician_self on clinicians
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Owner-scoped access for top-level clinical tables.
create policy patients_owner on patients
  for all using (clinician_id = auth.uid()) with check (clinician_id = auth.uid());

create policy encounters_owner on encounters
  for all using (clinician_id = auth.uid()) with check (clinician_id = auth.uid());

create policy queries_owner on queries
  for all using (clinician_id = auth.uid()) with check (clinician_id = auth.uid());

-- Child clinical tables inherit ownership through their encounter.
create policy problems_owner on problems
  for all using (exists (select 1 from encounters e where e.id = problems.encounter_id and e.clinician_id = auth.uid()))
  with check (exists (select 1 from encounters e where e.id = problems.encounter_id and e.clinician_id = auth.uid()));

create policy medications_owner on medications
  for all using (exists (select 1 from encounters e where e.id = medications.encounter_id and e.clinician_id = auth.uid()))
  with check (exists (select 1 from encounters e where e.id = medications.encounter_id and e.clinician_id = auth.uid()));

create policy allergies_owner on allergies
  for all using (exists (select 1 from encounters e where e.id = allergies.encounter_id and e.clinician_id = auth.uid()))
  with check (exists (select 1 from encounters e where e.id = allergies.encounter_id and e.clinician_id = auth.uid()));

create policy vitals_owner on vitals
  for all using (exists (select 1 from encounters e where e.id = vitals.encounter_id and e.clinician_id = auth.uid()))
  with check (exists (select 1 from encounters e where e.id = vitals.encounter_id and e.clinician_id = auth.uid()));

create policy labs_owner on labs
  for all using (exists (select 1 from encounters e where e.id = labs.encounter_id and e.clinician_id = auth.uid()))
  with check (exists (select 1 from encounters e where e.id = labs.encounter_id and e.clinician_id = auth.uid()));

-- Audit logs: clinician may read their own trail but never mutate it.
-- Inserts are performed server-side with the service role, bypassing RLS.
create policy audit_read_own on audit_logs
  for select using (clinician_id = auth.uid());
