-- Repair: enable RLS + policies on an existing public.notifications table.
--
-- Run this when the notifications table was created by hand (dashboard) WITHOUT
-- the RLS/policies from 20261023050000_notifications.sql. Symptom: no
-- notifications ever appear for any event (donate/confirm/reject/like/comment),
-- on both the supporter and athlete sides, because the shared insert and the
-- per-user read (listMyNotifications) that every notification type funnels
-- through are blocked at the DB layer.
--
-- Idempotent and safe to run on a live table: it does NOT drop or recreate the
-- table and touches no rows. It only enables row level security and (re)creates
-- the four owner-scoped policies the app assumes exist. Paste into the Supabase
-- SQL editor and run.

-- Enable RLS. With RLS off and no grants, PostgREST blocks access; with RLS off
-- and broad grants, any user could read everyone's notifications. Enabling RLS
-- + the recipient-scoped policies below is what makes reads private and inserts
-- work for the actor creating a row addressed to the recipient.
alter table public.notifications enable row level security;

-- Recipient-only read (this is what surfaces a user's own notifications).
drop policy if exists notifications_recipient_read on public.notifications;
create policy notifications_recipient_read on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

-- Any authenticated actor may create a notification addressed to a recipient
-- (a supporter's donation -> the athlete; an athlete's decision -> the
-- supporter; a liker/commenter -> the post author). READ exclusivity above is
-- what keeps notifications private, so the insert check stays permissive.
drop policy if exists notifications_authenticated_insert on public.notifications;
create policy notifications_authenticated_insert on public.notifications
  for insert to authenticated
  with check (auth.uid() is not null);

-- Recipient-only update (mark read) and delete.
drop policy if exists notifications_recipient_update on public.notifications;
create policy notifications_recipient_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists notifications_recipient_delete on public.notifications;
create policy notifications_recipient_delete on public.notifications
  for delete to authenticated
  using (recipient_id = auth.uid());

-- Reload PostgREST's schema cache so the policy changes take effect immediately.
notify pgrst, 'reload schema';

-- Verify (optional): expect rowsecurity = true and four policy rows.
--   select relrowsecurity as rls_enabled
--     from pg_class where oid = 'public.notifications'::regclass;
--   select policyname, cmd from pg_policies
--     where schemaname = 'public' and tablename = 'notifications'
--     order by policyname;
