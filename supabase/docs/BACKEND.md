# Starlete Backend (Supabase)

Real, database-backed implementation of the social core: auth, profiles,
posts, comments, reactions. Donations have a schema but are wired last.
Follows/notifications are out of scope for now.

## Stack decisions
- Auth: Supabase Auth (email+password). No hand-rolled JWT/bcrypt.
- Authorization: Postgres Row Level Security (RLS).
- API layer: Next.js Server Actions calling the Supabase server client.
- State: Server Components fetch; mutations via Server Actions + revalidatePath.
- Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY. No service_role key.

## Before launch (IMPORTANT)
The seeded demo athletes/posts are FICTIONAL and must be removed before
launching with real users. Run `supabase/seed_teardown.sql` to delete all
seeded rows (they carry a `seeded = true` marker). Never ship seed data.

## Roles
profiles.role in ('athlete','supporter'), chosen at signup. Athletes post and
receive donations; supporters comment, react, donate. Athletes cannot donate.

## Implementation order
1. Run 0001_init.sql  2. Run 0002_rls.sql  3. Run seed.sql
4. Session middleware  5. Real auth  6. Profiles from DB  7. Feed read
8. Post mutations  9. Comments+reactions  10. Delete mock  11. Harden
12. Docs  13. Donations (later)  14. Follows/notifications (future)
