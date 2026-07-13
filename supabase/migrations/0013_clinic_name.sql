-- The clinic/practice name the clinician enters at onboarding. Used as the
-- letterhead on exported visit notes (their document, their brand — not ours).
alter table clinicians add column clinic_name text;
