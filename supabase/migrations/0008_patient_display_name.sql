-- Optional patient display name. Pseudonymous records (the original default)
-- simply leave it null; nothing else changes. RLS on `patients` already
-- scopes rows to the owning clinician, so the name is as protected as the
-- rest of the chart.
alter table patients add column display_name text;
