-- ============================================================================
-- 0007_full_backend_rls.sql  (PRODUCTION ownership-enforcing RLS)
-- Every table has RLS. Reads are public (public showcase product); writes are
-- restricted to the row's owner. Seeded showcase rows (owner null) are
-- read-only. No anonymous writes anywhere.
-- ============================================================================

alter table public.athlete_profiles enable row level security;
alter table public.athletes  enable row level security;
alter table public.posts     enable row level security;
alter table public.comments  enable row level security;
alter table public.reactions enable row level security;
alter table public.qr_codes  enable row level security;
alter table public.donations enable row level security;

-- ---- athlete_profiles: public read; a user manages only their own ----------
drop policy if exists ap_read on public.athlete_profiles;
create policy ap_read on public.athlete_profiles for select using (true);
drop policy if exists ap_write_own on public.athlete_profiles;
create policy ap_write_own on public.athlete_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- athletes (catalog): public read; no client writes (seeded only) -------
drop policy if exists athletes_read on public.athletes;
create policy athletes_read on public.athletes for select using (true);
-- (no insert/update/delete policy => client writes denied; seed runs as owner)

-- ---- posts: public read; author owns writes --------------------------------
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts for insert
  with check (owner_id = auth.uid());

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts for delete
  using (owner_id = auth.uid());

-- ---- comments: public read; author owns writes -----------------------------
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (true);

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments for insert
  with check (owner_id = auth.uid());

drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments for delete
  using (owner_id = auth.uid());

-- ---- reactions: public read (counts); user owns their own like -------------
drop policy if exists reactions_read on public.reactions;
create policy reactions_read on public.reactions for select using (true);

drop policy if exists reactions_insert_own on public.reactions;
create policy reactions_insert_own on public.reactions for insert
  with check (owner_id = auth.uid());

drop policy if exists reactions_delete_own on public.reactions;
create policy reactions_delete_own on public.reactions for delete
  using (owner_id = auth.uid());

-- ---- qr_codes: public read; athlete owns their own codes -------------------
drop policy if exists qr_read on public.qr_codes;
create policy qr_read on public.qr_codes for select using (true);

drop policy if exists qr_write_own on public.qr_codes;
create policy qr_write_own on public.qr_codes for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---- donations --------------------------------------------------------------
-- Read: supporter sees their own; recipient athlete sees donations to them;
-- confirmed donations are publicly visible (they drive public funding totals).
drop policy if exists donations_read on public.donations;
create policy donations_read on public.donations for select
  using (
    status = 'confirmed'
    or supporter_id = auth.uid()
    or athlete_owner_id = auth.uid()
  );

-- Insert: a supporter records their own donation (supporter_id must be them).
drop policy if exists donations_insert_supporter on public.donations;
create policy donations_insert_supporter on public.donations for insert
  with check (supporter_id = auth.uid());

-- Update: only the recipient athlete may confirm/reject a donation to them.
drop policy if exists donations_update_recipient on public.donations;
create policy donations_update_recipient on public.donations for update
  using (athlete_owner_id = auth.uid()) with check (athlete_owner_id = auth.uid());
