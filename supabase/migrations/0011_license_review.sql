-- International clinician verification, operationalized. The US path stays
-- automatic (NPPES). Everyone else supplies their license/registration
-- number and licensing body at signup; an admin checks the body's public
-- register and approves from the in-app review queue. These columns hold
-- what the reviewer needs on screen.
--
-- No new RLS policies: the review queue and approval run server-side on the
-- service role with an app-level role check (clinicians.role = 'admin'),
-- like every other privileged path in this app.

alter table clinicians
  add column license_number text,
  add column license_body   text;  -- e.g. 'CPSO', 'GMC', 'AHPRA'
