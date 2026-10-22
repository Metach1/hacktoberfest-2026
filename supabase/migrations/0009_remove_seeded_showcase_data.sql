-- Remove seeded showcase records before serving only registered athlete accounts.
-- Rows owned by real accounts are preserved.
delete from public.donations
where catalog_athlete_id in (select id from public.athletes where seeded = true);

delete from public.qr_codes
where seeded = true
   or catalog_athlete_id in (select id from public.athletes where seeded = true);

delete from public.comments
where seeded = true
   or post_id in (
     select id from public.posts
     where seeded = true
        or catalog_athlete_id in (select id from public.athletes where seeded = true)
   );

delete from public.reactions
where post_id in (
  select id from public.posts
  where seeded = true
     or catalog_athlete_id in (select id from public.athletes where seeded = true)
);

delete from public.posts
where seeded = true
   or catalog_athlete_id in (select id from public.athletes where seeded = true);

delete from public.athletes where seeded = true;
delete from public.profiles where seeded = true;
