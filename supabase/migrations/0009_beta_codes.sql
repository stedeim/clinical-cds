-- Beta invite codes: free access for the founding-20 cohort in exchange for
-- an honest review. A code is single-use; redemption stamps who and when —
-- that audit IS the beta roster. `clinicians.is_beta` is the durable grant:
-- when billing lands, beta accounts bypass the paywall. A beta code never
-- affects verification_status — the clinical gate is independent of payment.

create table beta_codes (
  code         text primary key check (code ~ '^PABAID-[A-Z2-9]{5}$'),
  note         text,                                     -- who it was earmarked for
  -- References auth.users (not clinicians): redemption happens during signup,
  -- momentarily before the clinician profile row exists.
  redeemed_by  uuid references auth.users (id) on delete set null,
  redeemed_at  timestamptz,
  created_at   timestamptz not null default now()
);

alter table clinicians add column is_beta boolean not null default false;

alter table beta_codes enable row level security;
-- No policies on purpose: deny-all for API roles. Redemption happens only in
-- the signup route via the service role, which validates single-use itself.
