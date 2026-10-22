# How Startlete Is Built

Startlete uses Next.js App Router, React, TypeScript, and Supabase Auth/Postgres.
This document describes the current implementation rather than a planned
payment-provider or escrow integration.

## Direct support model

Athletes manage their profile and payment QR codes from their account. Public
discovery and athlete profiles use registered Supabase accounts; only athletes
with at least one published QR code are listed.

Supporters send money directly from their own wallet app to the athlete's
published QR. A supporter can report a transfer in the app, and the athlete
can confirm or reject that report. Transfers take place outside Startlete:
the app does not process, hold, settle, or independently verify money.

## Application structure

```text
app/
  layout.tsx                 Root layout, session provider, and shared chrome
  page.tsx                   Home
  discover/page.tsx          Registered athlete directory
  athletes/[id]/page.tsx     UUID-based athlete profile and public QR details
  login/page.tsx             Sign in
  register/page.tsx          Account creation
  dashboard/page.tsx         Role-aware supporter/athlete dashboard
  dashboard/edit/page.tsx    Profile editing
  globals.css                Application styles
src/app/
  services/
    auth.ts                  Supabase Auth
    profile.ts               Signed-in profile read/update
    public-athletes.ts        Public directory, profile, and QR reads
    qr.ts                    Athlete-owned QR management
    donations.ts             Direct-transfer reports and review
    feed.ts                  Supabase-backed social feed
  shared/
    session-provider.tsx     Supabase session and role state
    chrome.tsx               Shared header and footer
    async-state.tsx          Loading/error/retry helper
    ui.tsx                   Shared controls and profile cards
  screens/                   Route-level screens
  lib/
    supabase/                Browser/server Supabase clients
    region-map.ts            Generated map and search/filter helpers
supabase/migrations/         Database schema, RLS, and seeded-data cleanup
data/
  ph-regions.json            Generated region SVG paths
  geojson/                   Region source data and attribution
test/
  *.test.mjs                 Dependency-free Node tests
```

The root layout mounts `SessionProvider`; application screens query Supabase
through service modules and display loading/error states. Athlete profile
routes are dynamic UUID routes and are not statically generated from a sample
catalog.

## Supabase setup

1. Create a Supabase project.
2. Apply the migrations in order through
   `supabase/migrations/0012_create_athlete_profile_on_signup.sql`.
3. Copy `.env.example` to `.env.local` and set the project URL and public anon
   key.
4. Run `npm install` and `npm run dev`.

Migration `0009_remove_seeded_showcase_data.sql` removes database rows marked
as seeded. It preserves records owned by registered users. It must be applied
to the target Supabase project; application builds do not run database
migrations. Migration `0011_reconcile_athlete_profiles.sql` adds athlete profile
columns that were skipped when the table already existed during migration
`0006_full_backend.sql`. Migration `0012_create_athlete_profile_on_signup.sql`
updates the auth trigger so athlete signup saves the selected region and sport
to `athlete_profiles`.

Never expose a Supabase service-role key. Public reads and owner-specific writes
are enforced by database RLS policies.

## Region map

The Discover map renders the 18 Philippine administrative regions from
`data/ph-regions.json`. To regenerate the paths, run `npm run build:regions`.
The source and license are documented in `data/geojson/SOURCE.md`.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Landing page |
| `/discover` | Registered athlete directory and region map |
| `/athletes/:uuid` | Athlete profile and published payment QR codes |
| `/feed` | Community feed |
| `/login`, `/register` | Authentication |
| `/dashboard` | Role-aware account dashboard |
| `/dashboard/edit` | Edit profile |

## Validation

```bash
npm run lint
npm test
npm run build
```

The Node test suite covers the region taxonomy/map helpers and dependency-free
payment/QR parsing utilities.
