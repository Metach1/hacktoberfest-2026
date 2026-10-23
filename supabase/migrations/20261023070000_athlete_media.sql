-- Athlete media & profile extras (photos gallery, achievements, institution).
--
-- Additive and idempotent. Adds the columns the edit-profile screen writes and
-- the public profile reads, so an athlete's photos, achievements, and the
-- school/club they represent persist to the database instead of living only in
-- client state. Mirrors the additive style of
-- 20261023040000_athlete_province_city.sql.
--
-- JSON SHAPES (enforced by the app's pure logic modules, not the DB):
--   photos        jsonb array of { id, name, src, alt }
--                 (see src/app/lib/athlete-photos.mjs; capped at 8 client-side)
--   achievements  jsonb array of
--                 { id, title, event, date, description, isProudest }
--                 (see src/app/lib/achievements.mjs; at most one isProudest)
--   institution   plain text (see src/app/lib/institution.mjs)
--
-- RLS: no new policies are needed. The existing athlete_profiles policies from
-- 20261023010000_user_profiles.sql already cover every column —
-- `athlete_profiles_manage_self` (FOR ALL, user_id = auth.uid()) lets the owner
-- write these, and `athlete_profiles_public_read` (FOR SELECT using true) makes
-- them publicly readable for the profile/discovery screens.
--
-- The athlete_profiles table, its RLS policies, and the handle_new_user trigger
-- are defined in earlier migrations and are left untouched here (new columns
-- default to '[]'/null, so registration is unaffected).

alter table public.athlete_profiles
  add column if not exists photos jsonb not null default '[]'::jsonb,
  add column if not exists achievements jsonb not null default '[]'::jsonb,
  add column if not exists institution text;

-- Reload PostgREST's schema cache so the new columns resolve immediately.
notify pgrst, 'reload schema';
