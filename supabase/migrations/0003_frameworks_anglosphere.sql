-- Add the remaining English-speaking jurisdictions to the guideline framework
-- enum: Canada, Australia, New Zealand, Ireland. (US, UK_NICE, WHO exist from
-- 0001.) Matches GuidelineFramework in src/lib/types.ts and the profiles in
-- src/lib/guidelines.ts.
--
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block on
-- older Postgres; Supabase runs each migration statement fine as-is.

alter type guideline_framework add value if not exists 'CA';
alter type guideline_framework add value if not exists 'AU';
alter type guideline_framework add value if not exists 'NZ';
alter type guideline_framework add value if not exists 'IE';
