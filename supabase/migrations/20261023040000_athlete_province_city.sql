-- Athlete province / city.
--
-- Additive and idempotent. Adds the province and city columns the registration
-- cascade (region -> province -> city) writes, and extends the existing
-- handle_new_user trigger to populate them from signup metadata — mirroring how
-- region_code and location are already read with nullif(...,'').
--
-- The athlete_profiles table, its RLS policies, and the base trigger are
-- defined in earlier migrations and are left untouched here.

-- 1. The province/city columns the app reads (profile layer) and writes
--    (signUp metadata -> trigger).
alter table public.athlete_profiles
  add column if not exists province text,
  add column if not exists city text;

-- 2. Extend the registration trigger to map province/city from signup metadata.
--    Keeps the existing role split and region_code/location handling exactly;
--    only adds the two new fields to the athlete insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role text := coalesce(new.raw_user_meta_data->>'role', 'supporter');
begin
  insert into public.profiles (id, role, first_name, last_name)
  values (
    new.id,
    new_role,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  ) on conflict (id) do nothing;

  if new_role = 'athlete' then
    insert into public.athlete_profiles (user_id, sport, region_code, location, province, city)
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'sport', ''),
      nullif(new.raw_user_meta_data->>'region_code', ''),
      nullif(new.raw_user_meta_data->>'location', ''),
      nullif(new.raw_user_meta_data->>'province', ''),
      nullif(new.raw_user_meta_data->>'city', '')
    ) on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
