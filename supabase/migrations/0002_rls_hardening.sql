-- RLS hardening (offline audit of 0001_init.sql, 2026-07-02).
--
-- F1 (critical): the `clinician_self` FOR ALL policy let any authenticated
--   clinician UPDATE (or INSERT) their own row INCLUDING verification_status,
--   role, and credential — i.e. self-verify and self-promote via PostgREST,
--   defeating the verified-clinician gate. RLS scopes rows, not columns, so the
--   fix is: row policies for select/update only, plus COLUMN-level update
--   grants that exclude the privileged columns. Creation and verification of
--   clinician rows are service-role-only operations (the signup route).
--
-- F2: `queries_owner` WITH CHECK didn't require the referenced encounter to be
--   the clinician's own, allowing a query row to be attached to another
--   clinician's encounter id. Reads were never exposed; this fixes linkage
--   integrity.
--
-- F3: audit_logs append-only relied solely on the absence of update/delete
--   policies. A trigger now rejects UPDATE/DELETE at the table level too, so
--   even service-role code (which bypasses RLS, not triggers) cannot silently
--   mutate the trail.

-- ---------------------------------------------------------------------------
-- F1 — clinicians: no self-service escalation.
-- ---------------------------------------------------------------------------
drop policy clinician_self on clinicians;

create policy clinician_select_self on clinicians
  for select using (id = auth.uid());

create policy clinician_update_self on clinicians
  for update using (id = auth.uid()) with check (id = auth.uid());

-- No INSERT/DELETE policy for authenticated users: row creation happens via
-- the service role in the signup route; deletion cascades from auth.users.

-- Column-level guard: profile fields are self-editable; verification_status,
-- role, and credential are not (credential is what verification attests to).
revoke insert, update, delete on clinicians from anon, authenticated;
grant update (full_name, specialty, country, npi, primary_framework)
  on clinicians to authenticated;

-- ---------------------------------------------------------------------------
-- F2 — queries: the encounter referenced must be the clinician's own.
-- ---------------------------------------------------------------------------
drop policy queries_owner on queries;

create policy queries_owner on queries
  for all
  using (clinician_id = auth.uid())
  with check (
    clinician_id = auth.uid()
    and exists (
      select 1 from encounters e
      where e.id = queries.encounter_id and e.clinician_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- F3 — audit_logs: append-only enforced at the table level, not just by the
-- absence of policies. Triggers fire for the service role too.
-- ---------------------------------------------------------------------------
create or replace function reject_audit_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

create trigger audit_logs_append_only
  before update or delete on audit_logs
  for each row execute function reject_audit_mutation();
