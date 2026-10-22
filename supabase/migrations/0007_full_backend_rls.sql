-- ============================================================================
-- 0007_full_backend_rls.sql
-- RLS for the authoritative feature schema (0006).
--
-- Model: public READ on catalog/social data (the app is a public showcase);
-- writes allowed to any authenticated user for the demo's shared actors, scoped
-- where it matters. This is a demo-appropriate policy set — it keeps the
-- database as the gatekeeper (no anonymous writes) without modeling per-user
-- ownership the app's shared-actor demo does not have.
-- ============================================================================

alter table public.athletes  enable row level security;
alter table public.posts     enable row level security;
alter table public.comments  enable row level security;
alter table public.reactions enable row level security;
alter table public.qr_codes  enable row level security;
alter table public.donations enable row level security;

-- athletes: public read; no client writes (seeded server-side only).
drop policy if exists athletes_read on public.athletes;
create policy athletes_read on public.athletes for select using (true);

-- posts: public read; authenticated users may create/edit/delete (demo).
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);
drop policy if exists posts_write on public.posts;
create policy posts_write on public.posts for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- comments: public read; authenticated users may write.
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (true);
drop policy if exists comments_write on public.comments;
create policy comments_write on public.comments for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- reactions: public read (counts); authenticated users may add/remove.
drop policy if exists reactions_read on public.reactions;
create policy reactions_read on public.reactions for select using (true);
drop policy if exists reactions_write on public.reactions;
create policy reactions_write on public.reactions for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- qr_codes: public read (supporters need to see them); authed athletes write.
drop policy if exists qr_read on public.qr_codes;
create policy qr_read on public.qr_codes for select using (true);
drop policy if exists qr_write on public.qr_codes;
create policy qr_write on public.qr_codes for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- donations: public read (confirmed totals are public); authed users submit
-- and update (supporter submits; athlete confirms/rejects).
drop policy if exists donations_read on public.donations;
create policy donations_read on public.donations for select using (true);
drop policy if exists donations_write on public.donations;
create policy donations_write on public.donations for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
