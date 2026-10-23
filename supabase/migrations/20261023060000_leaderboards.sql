-- Leaderboards backend slice.
--
-- ADDITIVE and IDEMPOTENT. Provides database-computed leaderboards so the
-- dashboard can rank by real aggregates instead of sorting an in-memory array.
-- Follows the conventions of list_public_confirmed_donations /
-- auto_confirm_due_donations (see 20261023030000_donations_qr.sql): stable,
-- security definer, pinned search_path, revoke-from-public + grant-to-roles,
-- and a PostgREST schema reload at the end.
--
-- PRIVACY: every function aggregates ONLY confirmed donations (status =
-- 'confirmed'), matching the public confirmed-donation surface. Athlete names
-- come from public.profiles (first/last name); donor display names come from
-- donations.supporter_name (the name the supporter chose to show). No private
-- review data (receipts, references, notes, rejection details) is exposed.
--
-- NAMES follow the app's display conventions: an athlete with no name resolves
-- to 'Athlete'; a blank/absent donor name resolves to 'Anonymous supporter'.

-- 1. Top donors FOR A SPECIFIC ATHLETE by total confirmed amount given.
--    This is NOT a global leaderboard: it ranks only the supporters who gave to
--    the athlete identified by `athlete_id` (their Supabase owner UUID),
--    matching the per-athlete "Top donors" popup and topDonorsForProfile().
--    Named donors are grouped by supporter_id (a real account), aggregating
--    their total and count. Donations with no account (supporter_id is null)
--    or a blank/anonymous name are each kept as their OWN row (keyed by the
--    donation id), mirroring rankDonors(): the system cannot tell one
--    anonymous contribution from another, so it never merges them.
--    Tie-break: total desc, then most recent contribution, then id.
create or replace function public.leaderboard_top_donors(
  athlete_id uuid,
  limit_count integer default 10
)
returns table (
  donor_id text,
  donor_name text,
  total bigint,
  donation_count bigint,
  latest_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with confirmed as (
    select
      d.id,
      d.supporter_id,
      coalesce(nullif(btrim(d.supporter_name), ''), 'Anonymous supporter') as supporter_name,
      d.amount,
      d.created_at,
      -- A contribution is "anonymous" when it has no account OR a blank/sentinel
      -- name; such rows are never aggregated with any other.
      (d.supporter_id is null
        or btrim(coalesce(d.supporter_name, '')) = ''
        or btrim(d.supporter_name) = 'Anonymous supporter') as is_anonymous
    from public.donations d
    where d.status = 'confirmed'
      and d.athlete_owner_id = leaderboard_top_donors.athlete_id
  ),
  grouped as (
    -- Named, account-backed donors aggregated per account.
    select
      c.supporter_id::text as donor_id,
      max(c.supporter_name) as donor_name,
      sum(c.amount)::bigint as total,
      count(*)::bigint as donation_count,
      max(c.created_at) as latest_at
    from confirmed c
    where not c.is_anonymous
    group by c.supporter_id
    union all
    -- Each anonymous contribution stands alone, keyed by its donation id.
    select
      c.id::text as donor_id,
      'Anonymous supporter' as donor_name,
      c.amount::bigint as total,
      1::bigint as donation_count,
      c.created_at as latest_at
    from confirmed c
    where c.is_anonymous
  )
  select g.donor_id, g.donor_name, g.total, g.donation_count, g.latest_at
  from grouped g
  order by g.total desc, g.latest_at desc, g.donor_id
  limit greatest(coalesce(limit_count, 10), 0);
$$;

revoke all on function public.leaderboard_top_donors(uuid, integer) from public;
grant execute on function public.leaderboard_top_donors(uuid, integer) to anon, authenticated;

-- 2. Top athletes by total confirmed donations RECEIVED (amount).
--    Only registered athletes (athlete_owner_id not null) are ranked; a demo
--    catalog athlete has no backend profile to attribute received funds to.
--    Tie-break: total desc, then donation count desc, then id.
create or replace function public.leaderboard_top_athletes(limit_count integer default 10)
returns table (
  athlete_id uuid,
  athlete_name text,
  total bigint,
  donation_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    d.athlete_owner_id as athlete_id,
    coalesce(
      nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
      'Athlete'
    ) as athlete_name,
    sum(d.amount)::bigint as total,
    count(*)::bigint as donation_count
  from public.donations d
  join public.profiles p on p.id = d.athlete_owner_id
  where d.status = 'confirmed'
    and d.athlete_owner_id is not null
  group by d.athlete_owner_id, p.first_name, p.last_name
  order by total desc, donation_count desc, d.athlete_owner_id
  limit greatest(coalesce(limit_count, 10), 0);
$$;

revoke all on function public.leaderboard_top_athletes(integer) from public;
grant execute on function public.leaderboard_top_athletes(integer) to anon, authenticated;

-- 3. Trending athletes by DISTINCT supporter count (confirmed).
--    Deliberately a DIFFERENT metric from "top athletes": breadth of support
--    (how many distinct accounts backed them) rather than total amount. An
--    anonymous/account-less confirmed donation counts as one distinct supporter
--    per donation (it cannot be deduplicated), so grassroots support still
--    registers. Tie-break: supporters desc, then id.
create or replace function public.leaderboard_trending_athletes(limit_count integer default 10)
returns table (
  athlete_id uuid,
  athlete_name text,
  supporter_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    d.athlete_owner_id as athlete_id,
    coalesce(
      nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
      'Athlete'
    ) as athlete_name,
    -- Distinct accounts, plus one per account-less confirmed donation.
    (count(distinct d.supporter_id)
      + count(*) filter (where d.supporter_id is null))::bigint as supporter_count
  from public.donations d
  join public.profiles p on p.id = d.athlete_owner_id
  where d.status = 'confirmed'
    and d.athlete_owner_id is not null
  group by d.athlete_owner_id, p.first_name, p.last_name
  order by supporter_count desc, d.athlete_owner_id
  limit greatest(coalesce(limit_count, 10), 0);
$$;

revoke all on function public.leaderboard_trending_athletes(integer) from public;
grant execute on function public.leaderboard_trending_athletes(integer) to anon, authenticated;

-- Reload PostgREST's schema cache so the new RPCs resolve immediately.
notify pgrst, 'reload schema';
