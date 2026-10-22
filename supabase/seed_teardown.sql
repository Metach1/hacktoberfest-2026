-- Remove ALL seeded showcase data. Safe to run before real launch.
-- Order respects FKs (donations/qr/comments/reactions reference posts/athletes).
delete from public.donations where catalog_athlete_id in (select id from public.athletes where seeded);
delete from public.qr_codes where seeded or catalog_athlete_id in (select id from public.athletes where seeded);
delete from public.comments where seeded;
delete from public.posts where seeded;
delete from public.athletes where seeded;
