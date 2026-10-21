-- Starlete schema: social core + donation data model.
create extension if not exists moddatetime schema extensions;

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            text not null check (role in ('athlete','supporter')),
  username        text unique,
  first_name      text,
  last_name       text,
  profile_picture text,
  bio             text,
  seeded          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure extensions.moddatetime(updated_at);

create table if not exists public.athlete_profiles (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  sport          text,
  region_code    text,
  location       text,
  headline       text,
  website        text,
  socials        jsonb not null default '{}'::jsonb,
  funding_goal   integer check (funding_goal > 0),
  funding_raised integer not null default 0 check (funding_raised >= 0),
  verified       boolean not null default false
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 5000),
  media_urls text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public','supporters')),
  seeded     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_author_idx on public.posts(author_id);
create index if not exists posts_created_idx on public.posts(created_at desc);
create trigger posts_updated_at before update on public.posts
  for each row execute procedure extensions.moddatetime(updated_at);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  seeded     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments(post_id, created_at);

create table if not exists public.reactions (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'cheer',
  seeded        boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (post_id, user_id)
);
create index if not exists reactions_post_idx on public.reactions(post_id);

create table if not exists public.donations (
  id           uuid primary key default gen_random_uuid(),
  supporter_id uuid references public.profiles(id) on delete set null,
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  amount       integer not null check (amount > 0),
  seeded       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists donations_athlete_idx on public.donations(athlete_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, first_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'supporter'),
    new.raw_user_meta_data->>'first_name'
  ) on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();
