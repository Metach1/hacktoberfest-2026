-- 0001 creates athlete_profiles before 0006 expands its schema. Because 0006
-- uses CREATE TABLE IF NOT EXISTS, these columns are missing on databases
-- where the original table already existed.
alter table public.athlete_profiles
  add column if not exists bio text,
  add column if not exists achievement text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

notify pgrst, 'reload schema';
