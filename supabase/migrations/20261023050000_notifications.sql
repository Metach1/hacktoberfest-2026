-- In-app notifications.
--
-- Additive and idempotent. Gives notifications a backend with an EXCLUSIVE
-- recipient, replacing the previous in-memory/localStorage model that was
-- scoped only by role (audience) and therefore leaked across accounts.
--
-- Follows the conventions of the posts/donations migrations: a table with
-- created_at ordering, an index, RLS enabled, and owner-scoped policies. The
-- recipient (recipient_id) is the only user who may read/update/delete a row.
-- Any authenticated actor may INSERT a row addressed to another user (e.g. a
-- supporter's donation creates a notification for the recipient athlete).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- Recipient-only read.
drop policy if exists notifications_recipient_read on public.notifications;
create policy notifications_recipient_read on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

-- Any authenticated actor may create a notification addressed to a recipient.
-- The app only ever inserts rows for the correct recipient of a real event
-- (a donation's athlete/supporter, a post's author); exclusivity on READ is
-- what keeps notifications private, so the insert check stays permissive.
drop policy if exists notifications_authenticated_insert on public.notifications;
create policy notifications_authenticated_insert on public.notifications
  for insert to authenticated
  with check (auth.uid() is not null);

-- Recipient-only update (used to mark read) and delete.
drop policy if exists notifications_recipient_update on public.notifications;
create policy notifications_recipient_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists notifications_recipient_delete on public.notifications;
create policy notifications_recipient_delete on public.notifications
  for delete to authenticated
  using (recipient_id = auth.uid());
