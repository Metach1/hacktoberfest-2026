-- Direct QR transfers happen outside Startlete. Keep reports owned by the
-- supporter and allow only the receiving athlete to confirm or reject them.
drop policy if exists donations_read on public.donations;
create policy donations_read on public.donations for select
  using (supporter_id = auth.uid() or athlete_owner_id = auth.uid());

create or replace function public.public_athlete_support_totals(athlete_ids uuid[])
returns table (athlete_owner_id uuid, raised bigint, supporters bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select d.athlete_owner_id,
         sum(d.amount)::bigint as raised,
         count(distinct d.supporter_id)::bigint as supporters
  from public.donations d
  where d.status = 'confirmed'
    and d.athlete_owner_id = any(athlete_ids)
  group by d.athlete_owner_id;
$$;

revoke all on function public.public_athlete_support_totals(uuid[]) from public;
grant execute on function public.public_athlete_support_totals(uuid[]) to anon, authenticated;

drop policy if exists qr_write_own on public.qr_codes;
create policy qr_write_own on public.qr_codes for all
  using (owner_id = auth.uid() and public.current_role() = 'athlete')
  with check (owner_id = auth.uid() and public.current_role() = 'athlete');

drop policy if exists donations_insert_supporter on public.donations;
create policy donations_insert_supporter on public.donations for insert
  with check (
    supporter_id = auth.uid()
    and public.current_role() = 'supporter'
    and athlete_owner_id is not null
    and catalog_athlete_id is null
    and athlete_owner_id <> auth.uid()
    and exists (
      select 1 from public.profiles recipient
      where recipient.id = athlete_owner_id and recipient.role = 'athlete'
    )
  );

drop policy if exists donations_update_recipient on public.donations;
create policy donations_update_recipient on public.donations for update
  using (athlete_owner_id = auth.uid() and public.current_role() = 'athlete')
  with check (athlete_owner_id = auth.uid() and public.current_role() = 'athlete');

create or replace function public.enforce_direct_donation_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() <> old.athlete_owner_id or public.current_role() <> 'athlete' then
    raise exception 'Only the receiving athlete can review this transfer report';
  end if;

  if old.status <> 'pending' or new.status not in ('confirmed', 'rejected') then
    raise exception 'Only pending transfer reports can be confirmed or rejected';
  end if;

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
    new.confirmed_at := now();
    new.rejected_at := null;
    new.rejection_reason := null;
    new.rejection_note := '';
  else
    if new.rejection_reason is null
      or new.rejection_reason not in ('amount_mismatch', 'transfer_not_received', 'duplicate_reference', 'other') then
      raise exception 'A valid rejection reason is required';
    end if;
    new.confirmed_at := null;
    new.rejected_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_direct_donation_transition on public.donations;
create trigger enforce_direct_donation_transition
before update on public.donations
for each row execute procedure public.enforce_direct_donation_transition();
