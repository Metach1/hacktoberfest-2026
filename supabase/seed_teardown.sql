-- Remove ALL seeded demo data. Safe to run before launch.
delete from public.donations where supporter_key is not null and athlete_id in (select id from public.athletes where seeded);
delete from public.qr_codes where seeded;
delete from public.reactions where seeded;
delete from public.comments where seeded;
delete from public.posts where seeded;
delete from public.athletes where seeded;
