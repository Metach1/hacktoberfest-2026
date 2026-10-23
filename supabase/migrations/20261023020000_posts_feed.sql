create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(trim(content)) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  content text not null check (length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, owner_id)
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);
create index if not exists posts_owner_id_idx
  on public.posts (owner_id);
create index if not exists comments_post_created_at_idx
  on public.comments (post_id, created_at);
create index if not exists reactions_post_id_idx
  on public.reactions (post_id);

alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;

drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
  for select using (true);

drop policy if exists posts_athlete_insert_self on public.posts;
create policy posts_athlete_insert_self on public.posts
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'athlete'
    )
  );

drop policy if exists posts_owner_update on public.posts;
create policy posts_owner_update on public.posts
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists posts_owner_delete on public.posts;
create policy posts_owner_delete on public.posts
  for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists comments_public_read on public.comments;
create policy comments_public_read on public.comments
  for select using (true);

drop policy if exists comments_insert_self on public.comments;
create policy comments_insert_self on public.comments
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists reactions_public_read on public.reactions;
create policy reactions_public_read on public.reactions
  for select using (true);

drop policy if exists reactions_insert_self on public.reactions;
create policy reactions_insert_self on public.reactions
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists reactions_delete_self on public.reactions;
create policy reactions_delete_self on public.reactions
  for delete to authenticated
  using (owner_id = auth.uid());

notify pgrst, 'reload schema';
