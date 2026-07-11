-- Billing state, mirrored from Stripe via webhooks. Stripe is the source of
-- truth; these columns are a cache the app can gate on without a network
-- call. A clinician needs ONE of: is_beta (founding cohort), or a
-- subscription in ('trialing','active') to create cases and run CDS.
-- The sample encounter stays public regardless.

create type subscription_status as enum
  ('none', 'trialing', 'active', 'past_due', 'canceled');

alter table clinicians
  add column stripe_customer_id     text,
  add column stripe_subscription_id text,
  add column subscription_status    subscription_status not null default 'none',
  add column subscription_plan      text check (subscription_plan in ('solo', 'clinic')),
  -- Mirrors the Stripe trial/period end; the UI shows honest countdowns from
  -- this rather than calling Stripe per page view.
  add column current_period_end     timestamptz;

create index on clinicians (stripe_customer_id);
