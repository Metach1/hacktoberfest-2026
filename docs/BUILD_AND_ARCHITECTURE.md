# How Startletes Is Built

This guide explains the current application structure, how its screens and sample data fit together, and how to run and validate the project. It describes the repository as it exists today; planned product features are not presented as implemented functionality.

## Product direction

Startletes is a frontend prototype for discovering Filipino athletes and illustrating how a community could support them. Its product goals and non-negotiable constraints are described in the [project brief](./PROJECT_BRIEF.md). The UI was developed from the Startletes screen concepts in the [UI design notes](./startletes-ui-design.md).

The current app is a visual demo, not a production funding platform. It has no database, authentication, real athlete records, payment processing, or payouts. Athlete details, rankings, activity, and funding amounts are fictional examples.

## Technology

- **Next.js App Router** provides the application entry point, shared layout, and URL-based pages.
- **React** renders the shared UI components and screen content.
- **TypeScript** defines the UI data shapes and component props.
- **Tailwind CSS** styles the responsive dashboard and its screens.
- **Node.js** runs the dependency-free sample-data generator.
- **JSON** stores the generated fictional athlete profiles used by the demo.

Dependencies and runnable commands are declared in [`package.json`](../package.json).

## Application structure

The app is a single client component with internal, state-driven page switching
(landing, discover, profile, login, register, dashboards, edit) rather than
multiple App Router routes.

```text
app/
  layout.tsx                 Root layout: mounts the store provider + app chrome
  page.tsx                   Home route (/)
  globals.css                Design tokens and all component styles (incl. the map)
  not-found.tsx              404 page
  discover/page.tsx          /discover route
  athletes/[id]/page.tsx     /athletes/:id route (one per seed athlete)
  login/page.tsx             /login route
  register/page.tsx          /register route
  dashboard/page.tsx         /dashboard route (role-aware)
  dashboard/edit/page.tsx    /dashboard/edit route
src/
  app/
    store.tsx                StarleteProvider: shared role/athletes/posts state,
                             localStorage sync, and donation-modal state
    screens/                 One screen component per route (client components)
      landing.tsx  discover.tsx  athlete-profile.tsx
      auth.tsx     dashboard.tsx edit-profile.tsx
    shared/
      ui.tsx                 Icon, Logo, Progress, AthleteCard, peso, photos
      chrome.tsx             Header, Footer, AppChrome (shared layout chrome)
      donation.tsx           Global simulated-donation modal
    data/
      athletes.ts            Typed adapter: seed JSON -> UI `Athlete` view shape
    lib/
      regions.ts             Typed access to the 18-region taxonomy
      region-map.ts          Typed access to the generated region paths + helpers
data/
  athletes.json              Generated fictional profiles used by the app
  seed.mjs                   Deterministic profile generator and validation
  regions.mjs                Canonical 18-region taxonomy + name/code resolver
  athlete-adapter.mjs        Pure seed -> view transform (shared with tests)
  region-counts.mjs          Pure "athletes per region" tally (shared with tests)
  athlete-filter.mjs         Pure combined search/sport/region filter (shared)
  build-regions.mjs          Generates ph-regions.json from the source GeoJSON
  ph-regions.json            Generated SVG paths for the 18 regions
  geojson/                   Source region GeoJSON + SOURCE.md (provenance/license)
test/
  *.test.mjs                 node --test suite for the pure data/logic modules
public/
  philippines-map.svg        Country-outline illustration (single path)
  athlete-placeholder.svg    Generic artwork; not a real athlete photo
```

The app uses real App Router routes. Each `app/.../page.tsx` is a thin entry that
renders a screen component from `src/app/screens/`. Cross-cutting state that must
survive navigation — the current role, the live athlete list (whose funding
totals change as donations complete), demo posts, and the donation modal — lives
in a single client context, `StarleteProvider` (`src/app/store.tsx`), mounted
once in the root layout. The shared header, footer, and donation modal live in
`AppChrome` (`src/app/shared/chrome.tsx`), also in the layout, so they persist
across client-side navigations. Navigation uses `next/link` and `useRouter`
rather than in-memory page state, so every screen has its own URL and the browser
back/forward buttons work. The app reads its fictional athletes from the
generated seed through the typed adapter in `src/app/data/athletes.ts`.

Deep links and shareable URLs: each athlete has a route at `/athletes/:id` (all
30 seed athletes are prerendered at build time), and Discover reflects the
selected region in the URL (`/discover?region=NCR`) so filtered views are
shareable and back-button friendly. The dashboard and edit routes redirect to
`/login` when no role is selected.

The Discover screen renders an interactive map of the 18 Philippine
administrative regions above its filters. The map reads the generated region
outlines and the pure region/filter helpers through `src/app/lib/region-map.ts`;
region names are resolved to canonical codes through `src/app/lib/regions.ts`.
Clicking a populated region filters the athlete grid to that region. The map
shapes are generated at build time (see below) rather than drawn by hand or by a
runtime mapping library.

The sample profile statistics, donation flow, and activity feed are illustrative
UI values rather than account-backed data; no real payments are processed.

## Sample-data flow

1. Run `npm run seed` from the repository root.
2. `data/seed.mjs` writes a deterministic `data/athletes.json` file. It validates the dataset, including profile count, required fields, unique identities, adult ages, and coverage of all 17 Philippine administrative regions the seed populates.
3. `src/app/data/athletes.ts` imports the JSON and maps each profile to the typed `Athlete` view shape (extended with a canonical `regionCode`) via the shared transform in `data/athlete-adapter.mjs`.
4. `StarleteProvider` holds the adapted athletes and the screens render them across the routes. Discover additionally tallies athletes per region and filters them by the selected region (read from the URL).

## Region-map data flow

1. Run `npm run build:regions` from the repository root.
2. `data/build-regions.mjs` reads the committed source GeoJSON in `data/geojson/`, resolves each region to a canonical code via `data/regions.mjs`, projects the geometry to the `0 0 300 470` viewBox, and writes `data/ph-regions.json` with one SVG path per region. It fails if a region is unmatched or if 18-region coverage is incomplete.
3. The Discover map reads those paths through `src/app/lib/region-map.ts` and renders them as an inline SVG.

Both generated files (`athletes.json`, `ph-regions.json`) are checked in, so the app runs without first regenerating them. The generators overwrite their outputs with the same deterministic content; they do not fetch external data at app runtime or append records. See the [sample-data guide](../data/README.md) for the complete schema, the region-map schema, and safety/provenance rules.

## Run locally

Requirements: Node.js 20.19 or newer and npm.

```bash
npm install
npm run seed
npm run build:regions
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app has real routes:

| Route | Screen |
| --- | --- |
| `/` | Landing |
| `/discover` (optionally `?region=<code>`) | Discover, with the interactive region map |
| `/athletes/:id` | Athlete profile (one per seed athlete) |
| `/login`, `/register` | Auth |
| `/dashboard` | Role-aware dashboard (redirects to `/login` when signed out) |
| `/dashboard/edit` | Edit profile |

No environment variables are required by the current app. `.env.example` is provided as a safe placeholder for future documented configuration; do not commit local secrets.

## Validate changes

Run the repository's current checks before opening a pull request:

```bash
npm run lint
npm run test
npm run build
```

`npm run test` runs the dependency-free Node test suite (`node --test`) for the
pure data and logic modules: the region taxonomy, the seed-to-view adapter, the
`countByRegion` and combined-filter helpers, and validation of the generated
`ph-regions.json`. `npm run build` checks that the application compiles and that
the App Router page builds. There is no separate browser-test command.

## Contributing and future development

Read [CONTRIBUTING.md](../CONTRIBUTING.md) before changing the project and follow the [Code of Conduct](../CODE_OF_CONDUCT.md). For scoped product changes, review the OpenSpec proposals in [`openspec/changes`](../openspec/changes) and keep implementation aligned with the project brief.

Database persistence, authentication, verification workflows, real donations, and payouts are not implemented. Do not add them implicitly as part of a UI task. Any future implementation must be planned explicitly and must preserve the brief's fake-data, privacy, and no-real-payments constraints.
