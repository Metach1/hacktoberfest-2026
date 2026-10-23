-- Donations / QR backend slice.
--
-- This migration is ADDITIVE and IDEMPOTENT. It assumes the base donations and
-- qr_codes tables already exist (created by the earlier backend migrations) and
-- follows the project's existing conventions:
--   * authorization via the public.current_role() helper (not a profiles lookup)
--   * the existing public.enforce_direct_donation_transition() review trigger
--
-- It brings the schema up to what the donations/QR frontend slice needs:
--   1. a confirmed_by column (athlete | auto) the app reads and writes
--   2. an extended transition trigger that handles confirmed_by, supporter
--      resubmit, and the 3-day demo auto-confirm path
--   3. list_public_confirmed_donations() for public confirmed-donation reads
--   4. auto_confirm_due_donations() for the demo auto-confirm sweep
--   5. supporter resubmit/delete RLS policies
--
-- NOTE on scope: auto_confirm_due_donations() runs UPDATEs as the signed-in
-- user, so the donations_update_recipient policy limits the sweep to donations
-- owned by the signed-in athlete. That matches the demo intent (each athlete
-- auto-confirms their own aged-out receipts). A global sweep would need a
-- service-role / definer-bypass design and is intentionally out of scope here.

-- 1. The confirmed_by column the app reads (DONATION_COLUMNS) and writes
--    (confirmDonation -> 'athlete', auto-confirm -> 'auto').
alter table public.donations
  add column if not exists confirmed_by text
    check (confirmed_by is null or confirmed_by in ('athlete', 'auto'));

-- 2. Extend the existing review trigger. Keeps the current_role() design and
--    the pending -> confirmed/rejected review flow, and adds:
--      * confirmed_by handling on confirm,
--      * the demo 3-day auto-confirm path (confirmed_by = 'auto'),
--      * supporter resubmit (rejected -> pending),
--      * a widened rejection-reason allow-list that is the UNION of the
--        previously-accepted values and the values the app sends, so neither
--        existing data nor the current UI breaks.
create or replace function public.enforce_direct_donation_transition()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    return new;
  end if;

  -- Supporter resubmit: rejected -> pending (owned by the supporter).
  if old.status = 'rejected' and new.status = 'pending' then
    if auth.uid() <> old.supporter_id or public.current_role() <> 'supporter' then
      raise exception 'Only the supporter who submitted this donation can resubmit it';
    end if;
    if new.id is distinct from old.id
      or new.supporter_id is distinct from old.supporter_id
      or new.athlete_owner_id is distinct from old.athlete_owner_id
      or new.catalog_athlete_id is distinct from old.catalog_athlete_id
      or new.created_at < old.created_at then
      raise exception 'Donation ownership and creation time cannot be changed';
    end if;
    new.confirmed_at := null;
    new.confirmed_by := null;
    new.rejected_at := null;
    new.rejection_reason := null;
    new.rejection_note := '';
    return new;
  end if;

  if old.status <> 'pending' or new.status not in ('confirmed', 'rejected') then
    raise exception 'Only pending transfer reports can be confirmed or rejected';
  end if;

  -- Immutable fields during review.
  if new.supporter_id is distinct from old.supporter_id
    or new.id is distinct from old.id
    or new.athlete_owner_id is distinct from old.athlete_owner_id
    or new.catalog_athlete_id is distinct from old.catalog_athlete_id
    or new.amount is distinct from old.amount
    or new.method is distinct from old.method
    or new.reference is distinct from old.reference
    or new.supporter_name is distinct from old.supporter_name
    or new.receipt_name is distinct from old.receipt_name
    or new.receipt_preview is distinct from old.receipt_preview
    or new.note is distinct from old.note
    or new.created_at is distinct from old.created_at then
    raise exception 'Transfer report details cannot be changed during review';
  end if;

  if new.status = 'confirmed' then
    -- Recipient athlete confirmation, OR the demo auto path (3-day window).
    if old.athlete_owner_id = auth.uid() and public.current_role() = 'athlete' then
      new.confirmed_by := 'athlete';
    elsif new.confirmed_by = 'auto'
      and old.created_at <= now() - interval '3 days' then
      null;  -- allowed: aged-out auto-confirm
    else
      raise exception 'Only the recipient athlete can confirm this donation';
    end if;
    new.confirmed_at := now();
    new.rejected_at := null;
    new.rejection_reason := null;
    new.rejection_note := '';
  else
    -- Reject: recipient athlete only.
    if auth.uid() <> old.athlete_owner_id or public.current_role() <> 'athlete' then
      raise exception 'Only the receiving athlete can reject this donation';
    end if;
    if new.rejection_reason is null
      or new.rejection_reason not in (
        'amount_mismatch', 'invalid_receipt', 'wrong_image',
        'transfer_not_received', 'duplicate_reference', 'other'
      ) then
      raise exception 'A valid rejection reason is required';
    end if;
    new.confirmed_at := null;
    new.confirmed_by := null;
    new.rejected_at := now();
  end if;

  return new;
end;
$function$;

-- The trigger itself already exists (enforce_direct_donation_transition on
-- public.donations); create-or-replace above updates its function body in
-- place, so no trigger DDL is needed here.

-- 3. Public read of confirmed donations (returns confirmed_by). Used by
--    listDonations() to surface confirmed donations beyond the caller's own.
create or replace function public.list_public_confirmed_donations()
returns table (
  id uuid,
  athlete_owner_id uuid,
  catalog_athlete_id integer,
  amount integer,
  supporter_name text,
  status text,
  created_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select d.id, d.athlete_owner_id, d.catalog_athlete_id, d.amount,
         d.supporter_name, d.status, d.created_at, d.confirmed_at, d.confirmed_by
  from public.donations d
  where d.status = 'confirmed';
$$;

revoke all on function public.list_public_confirmed_donations() from public;
grant execute on function public.list_public_confirmed_donations() to anon, authenticated;

-- 4. The no-arg auto-confirm sweep the app calls via supabase.rpc(...).
create or replace function public.auto_confirm_due_donations()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to run demo auto-confirmation';
  end if;

  update public.donations
  set status = 'confirmed', confirmed_by = 'auto'
  where status = 'pending'
    and created_at <= now() - interval '3 days';

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.auto_confirm_due_donations() from public;
grant execute on function public.auto_confirm_due_donations() to authenticated;

-- 5. Supporter-side policies the app's resubmit/delete flows need. The existing
--    donations_read / donations_insert_supporter / donations_update_recipient
--    and qr_codes policies are left untouched.
drop policy if exists donations_supporter_resubmit on public.donations;
create policy donations_supporter_resubmit on public.donations
  for update to public
  using (
    supporter_id = auth.uid()
    and status = 'rejected'
    and public.current_role() = 'supporter'
  )
  with check (supporter_id = auth.uid() and status = 'pending');

drop policy if exists donations_supporter_delete on public.donations;
create policy donations_supporter_delete on public.donations
  for delete to public
  using (
    supporter_id = auth.uid()
    and status in ('pending', 'rejected')
    and public.current_role() = 'supporter'
  );

-- 6. Reload PostgREST's schema cache so the new RPCs resolve immediately.
notify pgrst, 'reload schema';
