-- ============================================================================
-- 0003_feature_schema_down.sql  — reverse of 0003_feature_schema.sql
-- Run only to roll back the feature-schema additions. Order matters.
-- NOTE: Dropping the expanded donation columns discards any lifecycle/receipt
-- data stored in them. Reversible in structure; run intentionally.
-- ============================================================================

-- 3) donations: drop the expanded lifecycle columns + constraint/index
alter table public.donations drop constraint if exists donations_status_check;
drop index if exists public.donations_status_idx;
alter table public.donations drop column if exists rejection_note;
alter table public.donations drop column if exists rejection_reason;
alter table public.donations drop column if exists rejected_at;
alter table public.donations drop column if exists confirmed_by;
alter table public.donations drop column if exists confirmed_at;
alter table public.donations drop column if exists status;
alter table public.donations drop column if exists note;
alter table public.donations drop column if exists receipt_preview;
alter table public.donations drop column if exists receipt_name;
alter table public.donations drop column if exists supporter_name;
alter table public.donations drop column if exists reference;
alter table public.donations drop column if exists method;

-- 2) qr_codes
drop index if exists public.qr_codes_athlete_idx;
drop table if exists public.qr_codes;

-- 1) identity bridge
drop index if exists public.profiles_public_id_key;
alter table public.profiles alter column public_id drop default;
alter table public.profiles drop column if exists public_id;
drop sequence if exists public.profiles_public_id_seq;
