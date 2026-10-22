alter table public.profiles
  add column if not exists last_name text,
  add column if not exists profile_picture text,
  add column if not exists bio text;

create table if not exists public.athlete_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sport text,
  region_code text,
  location text,
  bio text,
  achievement text,
  funding_goal integer check (funding_goal is null or funding_goal > 0),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.athlete_profiles
  add column if not exists sport text,
  add column if not exists region_code text,
  add column if not exists location text,
  add column if not exists bio text,
  add column if not exists achievement text,
  add column if not exists funding_goal integer,
  add column if not exists verified boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;
alter table public.athlete_profiles enable row level security;

drop policy if exists profiles_public_athletes_read on public.profiles;
create policy profiles_public_athletes_read on public.profiles
  for select using (role = 'athlete');

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Profile role cannot be changed by the account owner';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();

drop policy if exists athlete_profiles_public_read on public.athlete_profiles;
create policy athlete_profiles_public_read on public.athlete_profiles
  for select using (true);

drop policy if exists athlete_profiles_manage_self on public.athlete_profiles;
create policy athlete_profiles_manage_self on public.athlete_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile images are publicly readable" on storage.objects;
create policy "Profile images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-images');

drop policy if exists "Users upload their own profile image" on storage.objects;
create policy "Users upload their own profile image"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users update their own profile image" on storage.objects;
create policy "Users update their own profile image"
  on storage.objects for update
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete their own profile image" on storage.objects;
create policy "Users delete their own profile image"
  on storage.objects for delete
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

notify pgrst, 'reload schema';
