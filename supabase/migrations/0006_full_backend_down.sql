-- ============================================================================
-- 0006_full_backend_down.sql  — reverse of 0006 + 0007.
-- Drops the authoritative feature tables. Run intentionally; this discards all
-- feature data (posts, comments, reactions, qr_codes, donations, athletes).
-- profiles / auth are untouched.
-- ============================================================================
drop table if exists public.donations cascade;
drop table if exists public.qr_codes cascade;
drop table if exists public.reactions cascade;
drop table if exists public.comments cascade;
drop table if exists public.posts cascade;
drop table if exists public.athletes cascade;
