# Startlete Backend

This document describes the backend architecture **as it actually is today**,
and what is planned next. It is written to be accurate, not aspirational.

## Summary

- **Database-backed today (Supabase + RLS):** authentication, user profiles
  (incl. athlete profiles with region/sport/funding goal), and the social feed
  (posts, comments, reactions) with real per-user ownership.
- **Still on the client store (next slices):** the Discover map's athlete source
  and the QR/donation lifecycle. The database schema for these already exists in
  `supabase/migrations/`; wiring is in progress.

Features are being migrated to the database in verified vertical slices, keeping
the app building green at every step.

## Schema status

The live database matches the production schema in
`supabase/migrations/0006_full_backend.sql` across all feature tables
(profiles, athlete_profiles, athletes, posts, comments, reactions, qr_codes,
donations). One historical drift was reconciled: an earlier-created
`athlete_profiles` was missing `created_at`/`updated_at`; those columns and the
`moddatetime` trigger were added to match 0006. A fresh deploy from the
migrations produces the correct shape directly.

## What is database-backed today (Supabase)

**Authentication & identity**
- Sign up, log in, log out via **Supabase Auth** (email + password). Supabase
  handles password hashing, JWT issuance, refresh tokens, and session
  persistence — we do not hand-roll any of that.
- Each auth user gets a row in `public.profiles` (via a signup trigger) carrying
  their `role` (`athlete` | `supporter`).
- Sessions are refreshed on every request by `proxy.ts` (Next.js 16 Proxy,
  formerly Middleware) using `@supabase/ssr`.
- The current user and role are exposed app-wide through `SessionProvider`
  (`src/app/shared/session-provider.tsx`); the header and auth screens read
  from it.

**Security**
- Authorization is enforced in the database by **Row Level Security** policies,
  not by client-side checks. A client claiming a role is irrelevant; Postgres
  checks the authenticated user against the policies.
- Only the public anon key is used in the app. The Supabase **service-role key
  is never used or shipped**.
- Policies: public read on public data; writes restricted to the owning user;
  roles cannot be self-escalated (enforced by a trigger); athletes-only for
  posting; supporters-only for donating.

**Files**
- `src/app/lib/supabase/client.ts` — browser client
- `src/app/lib/supabase/server.ts` — server client (`@supabase/ssr`)
- `src/app/lib/supabase/proxy-session.ts` + `proxy.ts` — session refresh
- `src/app/services/auth.ts` — signUp / signIn / signOut
- `src/app/shared/session-provider.tsx` — session/role state

## Database schema (migrations)

Run in the Supabase SQL editor in order. All are additive and reversible.

| File | Purpose |
| --- | --- |
| `supabase/migrations/0001_init.sql` | Core tables: profiles, athlete_profiles, posts, comments, reactions, donations; signup trigger. |
| `supabase/migrations/0002_rls.sql` | Enable RLS + policies on the core tables. |
| `supabase/migrations/0003_feature_schema.sql` | Feature gaps: `public_id` bridge, `qr_codes` table, expanded `donations` lifecycle/receipt columns. |
| `supabase/migrations/0003_feature_schema_down.sql` | Reversible rollback of 0003. |
| `supabase/migrations/0004_feature_rls.sql` | RLS for `qr_codes` and the donation lifecycle update policy. |

The schema therefore already models users, profiles, posts, comments,
reactions, QR codes, and the full donation lifecycle. **0001 and 0002 are
required** for auth to work. 0003/0004 prepare the database for the social and
donation features that currently run client-side.

## What runs on the client store today (not yet DB-backed)

These features work and persist via `localStorage` through
`StarleteProvider` (`src/app/store.tsx`):

- Athlete catalog (30 fictional athletes)
- Social feed: posts, likes, comments (create/edit/delete)
- QR payment codes (athlete-published)
- Donation lifecycle: pending → confirmed/rejected, auto-confirm, receipts,
  supporter "my payments"

All of this data is **fictional demo data** (see `data/README.md`).

## Next steps (to make the above DB-backed)

The main remaining work is an identity-model decision: the app models athletes
as a **numeric catalog** (not login accounts), while `profiles` keys off
`auth.users` UUIDs. Wiring the social core to the DB means introducing an
`athletes` catalog table (content, not users) and repointing
posts/comments/reactions/qr_codes/donations at it, then converting the store's
synchronous reads/writes to async Supabase calls with loading/error states.
This was intentionally deferred rather than rushed.

## Environment

Local only, in `.env.local` (gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Placeholders are documented in `.env.example`.
