-- ============================================================================
-- 0006_full_backend.sql
-- Authoritative schema for backing EVERY app feature with Supabase.
--
-- Builds on 0001/0002 (profiles + auth + RLS). Supersedes the exploratory
-- 0003/0004 by defining the final feature tables coherently. Safe to run after
-- 0001/0002; feature tables are (re)created to match the app's real data model.
--
-- Identity model:
--   * profiles  = real signed-up users (FK to auth.users). Used for auth and
--                 for the acting supporter/athlete identity.
--   * athletes  = the 30 demo athletes as a CATALOG (numeric id = app id).
--                 They are content, not login accounts.
-- Feature rows reference athletes by numeric id and (optionally) the acting
-- user by profiles.id.
--
-- Reversible teardown: 0006_full_backend_down.sql
-- ============================================================================

-- Drop the exploratory feature tables from 0001 so we can define them to match
-- the app exactly. These are empty (features ran client-side), so no data loss.
drop table if exists public.reactions cascade;
drop table if exists public.comments cascade;
drop table if exists public.donations cascade;
drop table if exists public.qr_codes cascade;
drop table if exists public.posts cascade;

-- ---- athlete catalog --------------------------------------------------------
create table if not exists public.athletes (
  id           integer primary key,          -- matches the app's Athlete.id
  name         text not null,
  sport        text,
  location     text,
  region_code  text,
  region       text,
  image        text,
  bio          text,
  achievement  text,
  verified     boolean not null default false,
  funding_goal integer check (funding_goal is null or funding_goal > 0),
  -- fixed seed baseline; confirmed donations are added on top at read time
  base_raised      integer not null default 0,
  base_supporters  integer not null default 0,
  seeded       boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---- posts ------------------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  integer not null references public.athletes(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 5000),
  created_at  timestamptz not null default now(),
  edited_at   timestamptz,
  seeded      boolean not null default false
);
create index if not exists posts_athlete_idx on public.posts(athlete_id);
create index if not exists posts_created_idx on public.posts(created_at desc);

-- ---- comments ---------------------------------------------------------------
-- Author is either a real user (user_id) or a catalog athlete (athlete_id).
-- author_name is denormalized for display (the app shows a name per comment).
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  athlete_id  integer references public.athletes(id) on delete set null,
  author_name text not null,
  content     text not null check (char_length(content) between 1 and 2000),
  created_at  timestamptz not null default now(),
  seeded      boolean not null default false
);
create index if not exists comments_post_idx on public.comments(post_id, created_at);

-- ---- reactions (one per post per actor) -------------------------------------
-- actor_key identifies who reacted: a profile uuid as text, a catalog athlete
-- as 'athlete:<id>', or the demo supporter sentinel 'supporter'. The unique
-- index prevents double-likes per actor without needing a nullable composite.
create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  actor_key   text not null,
  created_at  timestamptz not null default now(),
  seeded      boolean not null default false,
  unique (post_id, actor_key)
);
create index if not exists reactions_post_idx on public.reactions(post_id);

-- ---- qr codes ---------------------------------------------------------------
create table if not exists public.qr_codes (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  integer not null references public.athletes(id) on delete cascade,
  method      text not null,
  label       text not null,
  image       text not null,
  seeded      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists qr_codes_athlete_idx on public.qr_codes(athlete_id);

-- ---- donations (full lifecycle) ---------------------------------------------
create table if not exists public.donations (
  id               uuid primary key default gen_random_uuid(),
  athlete_id       integer not null references public.athletes(id) on delete cascade,
  supporter_id     uuid references public.profiles(id) on delete set null,
  supporter_key    text,                 -- stable supporter identity (demo)
  amount           integer not null check (amount > 0),
  method           text not null default '',
  reference        text not null default '',
  supporter_name   text not null default 'Anonymous supporter',
  receipt_name     text not null default '',
  receipt_preview  text not null default '',
  note             text not null default '',
  status           text not null default 'pending'
                     check (status in ('pending','confirmed','rejected')),
  confirmed_at     timestamptz,
  confirmed_by     text check (confirmed_by in ('athlete','auto')),
  rejected_at      timestamptz,
  rejection_reason text,
  rejection_note   text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists donations_athlete_idx on public.donations(athlete_id);
create index if not exists donations_status_idx on public.donations(status);
