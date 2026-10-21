-- Starlete RLS policies. Enable RLS on every table, then define access.
-- Model: public can READ; writes are restricted to the owning user; roles
-- cannot be self-escalated; athletes-only for posting; supporters-only for donating.

alter table public.profiles         enable row level security;
alter table public.athlete_profiles enable row level security;
alter table public.posts            enable row level security;
alter table public.comments         enable row level security;
alter table public.reactions        enable row level security;
alter table public.donations        enable row level security;

-- Helper: the current user's role, read safely (SECURITY DEFINER avoids recursion).
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---- profiles ----
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (true);                       -- public profiles

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());       -- only your own row

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Block self role-escalation: role may change only if an admin-ish path does it.
-- For now, prevent any role change by the user themselves.
create or replace function public.prevent_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed by the user';
  end if;
  return new;
end; $$;
drop trigger if exists trg_prevent_role_change on public.profiles;
create trigger trg_prevent_role_change before update on public.profiles
  for each row execute procedure public.prevent_role_change();

-- ---- athlete_profiles ----
drop policy if exists athlete_read on public.athlete_profiles;
create policy athlete_read on public.athlete_profiles
  for select using (true);

drop policy if exists athlete_write_self on public.athlete_profiles;
create policy athlete_write_self on public.athlete_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- posts ----
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts
  for select using (true);

drop policy if exists posts_insert_athlete on public.posts;
create policy posts_insert_athlete on public.posts
  for insert with check (author_id = auth.uid() and public.current_role() = 'athlete');

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
  for delete using (author_id = auth.uid());

-- ---- comments ----
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments
  for select using (true);

drop policy if exists comments_insert_self on public.comments;
create policy comments_insert_self on public.comments
  for insert with check (user_id = auth.uid());

drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete using (user_id = auth.uid());

-- ---- reactions ----
drop policy if exists reactions_read on public.reactions;
create policy reactions_read on public.reactions
  for select using (true);                       -- counts are public

drop policy if exists reactions_insert_self on public.reactions;
create policy reactions_insert_self on public.reactions
  for insert with check (user_id = auth.uid());

drop policy if exists reactions_delete_own on public.reactions;
create policy reactions_delete_own on public.reactions
  for delete using (user_id = auth.uid());

-- ---- donations ----
drop policy if exists donations_read on public.donations;
create policy donations_read on public.donations
  for select using (true);

drop policy if exists donations_insert_supporter on public.donations;
create policy donations_insert_supporter on public.donations
  for insert with check (supporter_id = auth.uid() and public.current_role() = 'supporter');
