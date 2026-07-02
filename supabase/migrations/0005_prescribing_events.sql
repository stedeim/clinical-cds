-- Prescribing events — layer 3 of the region vision: the raw material for
-- "X% of doctors in <region> prescribe <drug> for <condition>" peer stats.
--
-- DE-IDENTIFIED AT WRITE TIME, by schema design, not by policy promise:
--   * no clinician_id, no patient_id, no encounter_id, no free text beyond a
--     condition label — a row cannot be traced back to a doctor or a patient;
--   * occurred_month (not a timestamp) — coarse time bucketing so low-volume
--     regions can't be re-identified by timing;
--   * region is a coarse code ("US", "US-TX", "GB-ENG"), never finer.
--
-- Regulatory framing: aggregates from this table are DESCRIPTIVE peer
-- statistics with a reviewable basis — surfaced as cited considerations,
-- never directive recommendations (Non-Device CDS).
--
-- Access: RLS enabled with NO policies — PostgREST users (anon/authenticated)
-- can neither read nor write rows. The server writes via the service role and
-- serves only AGGREGATES (counts by region/condition/ingredient), never rows.

create table prescribing_events (
  id                    uuid primary key default gen_random_uuid(),
  region                text not null check (char_length(region) between 2 and 12),
  condition_code        text,                       -- ICD-10 when known
  condition_label       text not null check (char_length(condition_label) <= 120),
  medication_ingredient text not null check (char_length(medication_ingredient) <= 80),
  occurred_month        date not null               -- always the 1st of the month
    check (extract(day from occurred_month) = 1)
);

create index on prescribing_events (region, condition_code, medication_ingredient);
create index on prescribing_events (occurred_month);

alter table prescribing_events enable row level security;
-- No policies on purpose: deny-all for API roles; service-role-only access.
