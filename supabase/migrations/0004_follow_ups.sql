-- Follow-up reminders: patient-action-and-report-back items tied to an
-- encounter, with clinician-chosen recipients (patient / clinician /
-- assistant). Mirrors src/lib/followup/schema.ts.
--
-- Deliberately NOT here yet: patient contact info and assistant contact
-- details. Real outbound delivery needs those plus documented consent and a
-- BAA-covered messaging provider — a data-model + vendor decision to make
-- when sending goes live, not silently in advance.

create type follow_up_status as enum ('pending', 'sent', 'completed', 'cancelled');

create table follow_ups (
  id            uuid primary key default gen_random_uuid(),
  clinician_id  uuid not null references clinicians (id) on delete cascade,
  encounter_id  uuid not null references encounters (id) on delete cascade,
  action        text not null check (char_length(action) between 3 and 300),
  due_at        timestamptz not null,
  -- Recipient set the clinician chose; constrained to the known roles.
  recipients    text[] not null check (
    array_length(recipients, 1) >= 1
    and recipients <@ array['patient', 'clinician', 'assistant']::text[]
  ),
  status        follow_up_status not null default 'pending',
  created_at    timestamptz not null default now()
);

create index on follow_ups (clinician_id, due_at);
create index on follow_ups (encounter_id);

alter table follow_ups enable row level security;

-- Owner-scoped, and the referenced encounter must be the clinician's own
-- (same linkage-integrity rule queries got in 0002).
create policy follow_ups_owner on follow_ups
  for all
  using (clinician_id = auth.uid())
  with check (
    clinician_id = auth.uid()
    and exists (
      select 1 from encounters e
      where e.id = follow_ups.encounter_id and e.clinician_id = auth.uid()
    )
  );
