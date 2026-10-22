# Changelog

All notable changes to Startlete are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow semantic versioning once it reaches a release.

## [Unreleased]

### Added

- Athletes can now edit and delete their own posts from the athlete dashboard.
  Editing opens a prefilled modal (matching the create-post flow) and marks the
  post as "edited"; deleting uses an inline confirm on the post card. Backed by
  new owner-scoped `editPost` and `deletePost` store actions and an optional
  `editedAt` field on `Post`.
- Real App Router routes replacing the single-URL experience: `/`, `/discover`,
  `/athletes/:id` (all 30 seed athletes prerendered), `/login`, `/register`,
  `/dashboard`, and `/dashboard/edit`, plus a `not-found` page. Each screen now
  has its own shareable URL and the browser back/forward buttons work.
  Discover reflects the selected region in the URL (`/discover?region=NCR`).
- Shared client state provider (`src/app/store.tsx`) holding role, the live
  athlete list, posts, and the donation modal, mounted once in the root layout
  so state survives client-side navigation. Shared header, footer, and donation
  modal moved into the layout chrome.
- Interactive Philippines region map on the Discover page, above the filters.
  Clicking a populated region filters the athlete grid to that region; the map,
  the region dropdown, search, and sport filters all work together. Regions with
  no athletes — including the Negros Island Region (NIR), the 18th region — are
  shown muted and are not selectable.
- Build-time region-map tooling: `data/build-regions.mjs` (run via
  `npm run build:regions`) converts a public, MIT-licensed Philippine regions
  GeoJSON (`data/geojson/`, see `SOURCE.md`) into committed static SVG region
  paths at `data/ph-regions.json`, projected to the app's 300x470 viewBox. No
  runtime mapping library is added.
- Canonical 18-region taxonomy (`data/regions.mjs`, typed via
  `src/app/lib/regions.ts`) with an alias table that resolves GeoJSON region
  names to the seed's region codes.
- Dependency-free Node test suite (`npm run test`, `node --test`) covering the
  region taxonomy, the seed-to-view athlete adapter, the `countByRegion` and
  combined-filter helpers, and validation of the generated region-map data.
- Startlete application screens: landing, discover, athlete profile, login,
  register, supporter dashboard, athlete dashboard, edit profile, and a
  multi-step simulated donation flow.
- Modern sports-community visual design (navy / blue / gold / white, Inter) in
  `app/globals.css`.
- Role-based experience: supporters can discover and donate; athletes manage a
  profile, verification status, funding progress, donations, and posts.
  Athletes cannot donate.
- Simulated donation checkout: preset or custom peso amounts, GCash / Maya /
  card / bank methods, review, processing, and success steps that update
  funding totals. No real payments are processed.
- Athlete registration collects name, birth date, sport, and location, with
  simulated parental consent required for minors.
- Client-side state persistence to `localStorage` (selected role and athlete
  funding totals survive reloads).
- QA report in `docs/QA_REPORT.md` covering build, type, lint, and a manual
  review of the critical user flows.

### Changed

- Refactored the single `src/app/starlete-app.tsx` client component into real
  App Router routes with per-screen components (`src/app/screens/`), shared
  chrome (`src/app/shared/`), and a shared state provider (`src/app/store.tsx`).
  In-memory page-state switching was replaced with URL-based navigation.
- The live app now sources its athletes from the 30-profile fictional seed
  (`data/athletes.json`) via a typed adapter (`src/app/data/athletes.ts`),
  replacing the previous hardcoded 5-athlete array. Persisted athlete data in
  `localStorage` is versioned (`starlete-data-version`) so returning visitors are
  migrated to the seed instead of keeping stale data.
- Discover's free-text location filter was replaced by a region filter that
  stays in sync with the interactive map selection.
- Replaced the earlier multi-route prototype and the earthy/editorial redesign
  with the Startlete single-app experience mounted at `/`.
- Switched the app font to Inter.

### Removed

- Obsolete route directories and feature modules from the previous prototype
  (`/browse`, `/login`, `/signup`, `/dashboard/*`, `/athletes/*`,
  `/leaderboard`, `/profile`, `/starletes`, `/admin`, `/welcome`) and their
  supporting `src/feat`, `src/lib`, `src/state`, and `components` files.
