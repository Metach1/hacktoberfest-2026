create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('athlete', 'supporter')),
  first_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_read_self on public.profiles
  for select using (id = auth.uid());

create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, first_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'supporter'),
    new.raw_user_meta_data->>'first_name'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
