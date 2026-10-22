-- Persist athlete signup details when Supabase creates the auth user.
-- This trigger runs with its owner's privileges, including when email
-- confirmation is enabled and the new user has no client session yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role text := coalesce(new.raw_user_meta_data->>'role', 'supporter');
begin
  insert into public.profiles (id, role, first_name)
  values (
    new.id,
    new_role,
    new.raw_user_meta_data->>'first_name'
  ) on conflict (id) do nothing;

  if new_role = 'athlete' then
    insert into public.athlete_profiles (user_id, sport, region_code, location)
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'sport', ''),
      nullif(new.raw_user_meta_data->>'region_code', ''),
      nullif(new.raw_user_meta_data->>'location', '')
    ) on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
