-- ============================================================================
-- 0003_feature_schema.sql
-- Close the schema gaps so every app feature can be backed by the database.
-- Additive and reversible. Safe to run on existing data (no drops, no data loss).
--
-- Adds:
--   1. profiles.public_id  — stable numeric handle bridging the app's numeric
--      athlete ids to the UUID-based auth model (decision: keep app ids).
--   2. qr_codes            — athlete payment QR codes (was entirely unmodeled).
--   3. donations (expanded)— full pending/confirm/reject lifecycle + receipt
--      and reference fields the app already uses in memory.
--
-- A matching teardown lives in 0003_feature_schema_down.sql.
-- ============================================================================

-- 1) Identity bridge: a stable numeric id per profile -------------------------
-- Lets feature rows reference an athlete by the same small integer the app
-- already uses, without migrating the whole app to UUIDs.
alter table public.profiles
  add column if not exists public_id bigint;

-- Backfill: assign sequential numbers to any existing profiles that lack one.
do $$
declare
  r record;
  next_id bigint := coalesce((select max(public_id) from public.profiles), 0);
begin
  for r in select id from public.profiles where public_id is null order by created_at loop
    next_id := next_id + 1;
    update public.profiles set public_id = next_id where id = r.id;
  end loop;
end $$;

-- Make it unique + auto-assigned going forward.
create sequence if not exists public.profiles_public_id_seq owned by public.profiles.public_id;
select setval(
  'public.profiles_public_id_seq',
  coalesce((select max(public_id) from public.profiles), 0) + 1,
  false
);
alter table public.profiles
  alter column public_id set default nextval('public.profiles_public_id_seq');
create unique index if not exists profiles_public_id_key on public.profiles(public_id);

-- 2) qr_codes: athlete payment QR codes --------------------------------------
create table if not exists public.qr_codes (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  method     text not null,                 -- e.g. "GCash", "Maya"
  label      text not null,                 -- display handle (fictional)
  image      text not null,                 -- data URL / path for the QR graphic
  seeded     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists qr_codes_athlete_idx on public.qr_codes(athlete_id);

-- 3) donations: expand to the full lifecycle the app already implements -------
alter table public.donations add column if not exists method           text;
alter table public.donations add column if not exists reference        text;
alter table public.donations add column if not exists supporter_name   text;
alter table public.donations add column if not exists receipt_name     text;
alter table public.donations add column if not exists receipt_preview  text;
alter table public.donations add column if not exists note             text;
alter table public.donations add column if not exists status           text
  not null default 'pending';
alter table public.donations add column if not exists confirmed_at     timestamptz;
alter table public.donations add column if not exists confirmed_by     text;   -- 'athlete' | 'auto'
alter table public.donations add column if not exists rejected_at      timestamptz;
alter table public.donations add column if not exists rejection_reason text;
alter table public.donations add column if not exists rejection_note   text;

-- Constrain status to the known lifecycle values (drop first so re-runs are safe).
alter table public.donations drop constraint if exists donations_status_check;
alter table public.donations
  add constraint donations_status_check
  check (status in ('pending','confirmed','rejected'));

create index if not exists donations_status_idx on public.donations(status);
