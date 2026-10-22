-- ============================================================================
-- 0006_full_backend.sql  (PRODUCTION identity + ownership model)
-- Authoritative schema for backing every app feature with Supabase, built for
-- a real deployed product (not a demo).
--
-- Builds on 0001/0002 (profiles + auth + RLS). Redefines the feature tables
-- coherently with REAL per-user ownership.
--
-- Identity model:
--   * profiles         = every real user (FK to auth.users), carrying role.
--   * athlete_profiles = athlete-only fields for a real athlete user (the data
--                        a logged-in athlete manages about themselves).
--   * athletes         = the 30 FICTIONAL showcase records (catalog). Content
--                        only, owned by no one, seeded=true, removed at launch.
--
-- Ownership: posts / qr_codes / donations carry owner_id -> profiles(id). RLS
-- lets a user modify only rows they own. Seeded showcase rows have owner_id
-- null and are read-only. A nullable catalog_athlete_id lets showcase content
-- attach to a fictional athlete for display.
--
-- Payments: QR-only. The app never processes or verifies money. Athletes
-- publish their own payment QR; supporters pay externally in their e-wallet and
-- record the donation; the recipient athlete confirms receipt. No auto-confirm.
--
-- Reversible teardown: 0006_full_backend_down.sql
-- ============================================================================

-- Replace the exploratory feature tables (empty; features ran client-side).
drop table if exists public.reactions cascade;
drop table if exists public.comments cascade;
drop table if exists public.donations cascade;
drop table if exists public.qr_codes cascade;
drop table if exists public.posts cascade;

-- ---- athlete_profiles: a REAL athlete user's own managed fields -------------
create table if not exists public.athlete_profiles (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  sport          text,
  region_code    text,
  location       text,
  bio            text,
  achievement    text,
  funding_goal   integer check (funding_goal is null or funding_goal > 0),
  verified       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger athlete_profiles_updated_at before update on public.athlete_profiles
  for each row execute procedure extensions.moddatetime(updated_at);

-- ---- athletes: FICTIONAL showcase catalog (no owner; removed at launch) -----
create table if not exists public.athletes (
  id           integer primary key,
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
  base_raised      integer not null default 0,
  base_supporters  integer not null default 0,
  seeded       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---- posts ------------------------------------------------------------------
-- owner_id: the real athlete user who authored it (null for seeded showcase).
-- catalog_athlete_id: for seeded showcase posts attached to a fictional athlete.
create table if not exists public.posts (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid references public.profiles(id) on delete cascade,
  catalog_athlete_id integer references public.athletes(id) on delete cascade,
  content            text not null check (char_length(content) between 1 and 5000),
  created_at         timestamptz not null default now(),
  edited_at          timestamptz,
  seeded             boolean not null default false,
  -- a post must belong to either a real owner or a catalog athlete
  constraint posts_has_author check (owner_id is not null or catalog_athlete_id is not null)
);
create index if not exists posts_owner_idx on public.posts(owner_id);
create index if not exists posts_catalog_idx on public.posts(catalog_athlete_id);
create index if not exists posts_created_idx on public.posts(created_at desc);

-- ---- comments ---------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  owner_id    uuid references public.profiles(id) on delete set null,
  author_name text not null,
  content     text not null check (char_length(content) between 1 and 2000),
  created_at  timestamptz not null default now(),
  seeded      boolean not null default false
);
create index if not exists comments_post_idx on public.comments(post_id, created_at);

-- ---- reactions (one per post per real user) ---------------------------------
create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (post_id, owner_id)
);
create index if not exists reactions_post_idx on public.reactions(post_id);

-- ---- qr codes: owned by the real athlete who publishes them ------------------
create table if not exists public.qr_codes (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid references public.profiles(id) on delete cascade,
  catalog_athlete_id integer references public.athletes(id) on delete cascade,
  method             text not null,
  label              text not null,
  image              text not null,
  seeded             boolean not null default false,
  created_at         timestamptz not null default now(),
  constraint qr_has_owner check (owner_id is not null or catalog_athlete_id is not null)
);
create index if not exists qr_codes_owner_idx on public.qr_codes(owner_id);
create index if not exists qr_codes_catalog_idx on public.qr_codes(catalog_athlete_id);

-- ---- donations: supporter submits; recipient athlete confirms ----------------
-- supporter_id: the real supporter who recorded it (owns "my payments").
-- athlete_owner_id: the real athlete recipient (null if paying a catalog demo).
-- catalog_athlete_id: recipient when it's a fictional showcase athlete.
-- NO auto-confirm: status moves pending -> confirmed/rejected only by the athlete.
create table if not exists public.donations (
  id                 uuid primary key default gen_random_uuid(),
  supporter_id       uuid references public.profiles(id) on delete set null,
  athlete_owner_id   uuid references public.profiles(id) on delete cascade,
  catalog_athlete_id integer references public.athletes(id) on delete cascade,
  amount             integer not null check (amount > 0),
  method             text not null default '',
  reference          text not null default '',
  supporter_name     text not null default 'Anonymous supporter',
  receipt_name       text not null default '',
  receipt_preview    text not null default '',
  note               text not null default '',
  status             text not null default 'pending'
                       check (status in ('pending','confirmed','rejected')),
  confirmed_at       timestamptz,
  rejected_at        timestamptz,
  rejection_reason   text,
  rejection_note     text not null default '',
  created_at         timestamptz not null default now(),
  constraint donation_has_recipient
    check (athlete_owner_id is not null or catalog_athlete_id is not null)
);
create index if not exists donations_supporter_idx on public.donations(supporter_id);
create index if not exists donations_athlete_owner_idx on public.donations(athlete_owner_id);
create index if not exists donations_catalog_idx on public.donations(catalog_athlete_id);
create index if not exists donations_status_idx on public.donations(status);
