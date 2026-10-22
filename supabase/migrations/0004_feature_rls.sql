-- ============================================================================
-- 0004_feature_rls.sql
-- RLS for the new qr_codes table and updated donation-write rules.
-- Mirrors the security model: public read where it makes sense; writes locked
-- to the owning user; role checks enforced in the database.
-- ============================================================================

alter table public.qr_codes enable row level security;

-- qr_codes: anyone can read (supporters need to see an athlete's payment codes);
-- only the owning athlete can create/update/delete their own codes.
drop policy if exists qr_read on public.qr_codes;
create policy qr_read on public.qr_codes
  for select using (true);

drop policy if exists qr_write_own on public.qr_codes;
create policy qr_write_own on public.qr_codes
  for all
  using (athlete_id = auth.uid() and public.current_role() = 'athlete')
  with check (athlete_id = auth.uid() and public.current_role() = 'athlete');

-- donations: a supporter may UPDATE only to their own rows is not needed, but
-- the ATHLETE who received a donation must be able to confirm/reject it.
-- Insert policy (supporter-only) already exists from 0002. Add an update policy
-- so the receiving athlete can move a donation through its lifecycle.
drop policy if exists donations_update_recipient on public.donations;
create policy donations_update_recipient on public.donations
  for update
  using (athlete_id = auth.uid() and public.current_role() = 'athlete')
  with check (athlete_id = auth.uid() and public.current_role() = 'athlete');
