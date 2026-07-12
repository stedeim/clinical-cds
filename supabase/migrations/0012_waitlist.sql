-- Waitlist for clinicians who arrive without a founding-beta code. Just an
-- email and optional context; no account, no PHI. When a beta seat frees up
-- or general availability opens, this is who gets invited. Email is unique
-- so re-submitting is idempotent (no duplicates, no error to the visitor).

create table waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  role        text,                                   -- e.g. "Family medicine, Ontario"
  source      text,                                   -- landing surface it came from
  created_at  timestamptz not null default now()
);

alter table waitlist enable row level security;
-- No policies: deny-all for API roles. Inserts happen server-side via the
-- service role in /api/waitlist.
