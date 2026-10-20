# Startlete

Startlete is an open-source demo platform concept for helping Filipino athletes get discovered and funded by region, merit, and need. The current Next.js app demonstrates athlete discovery, a Philippines map, browsing, a leaderboard, and an athlete profile.

> **Demo safety:** All athlete records and funding figures must be fictional. Funding and voting are illustrative only: this project does not process payments, transfer funds, or provide payouts. Do not add real athlete information, personal documents, credentials, or payment details.

## Features

- Landing page, athlete discovery, athlete profile, dashboards, and a simulated donation flow
- **Interactive Philippines map on Discover** — click a region to see the athletes training there (see below)
- Athlete browse cards with search, sport, and region filtering
- Fictional, repeatable seed data for development and demos (30 athletes across the regions)

The current interface is a frontend prototype. Authentication, verification, real funding, and persistent user data are not implemented.

## Interactive region map

The Discover page (`/`, then "Discover") shows a geographically accurate,
clickable map of the 18 Philippine administrative regions above the filters:

- Regions that have athletes are highlighted and clickable. Selecting one filters
  the athlete grid to that region; selecting again (or "All regions") clears it.
- Regions with no athletes yet — including the **Negros Island Region (NIR)**,
  the 18th region — are shown muted and are not selectable.
- The map is a dependency-free inline SVG. Its region shapes are generated at
  build time from a public, MIT-licensed GeoJSON into
  [`data/ph-regions.json`](./data/ph-regions.json); no runtime map library is
  used. Regenerate it with `npm run build:regions`. Source and license:
  [`data/geojson/SOURCE.md`](./data/geojson/SOURCE.md).

### How to demo the map

1. Run the app (`npm run dev`) and go to the Discover page.
2. Hover a highlighted region to see its athlete count; click it to filter the grid.
3. Combine with the search box and sport dropdown — all filters apply together.
4. Click a muted region (e.g. NIR) to confirm it is not selectable.
5. Click "All regions" (or the region again) to clear the selection.

## Tech stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Node.js seed script and JSON sample data

See [`docs/BUILD_AND_ARCHITECTURE.md`](./docs/BUILD_AND_ARCHITECTURE.md) for the application structure, data flow, route guide, and development workflow.

## Getting started

### Prerequisites

- Node.js 20.19 or newer
- npm

### Install and run

```bash
npm install
npm run seed
npm run build:regions
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

- `npm run seed` regenerates `data/athletes.json` (the fictional athlete seed).
- `npm run build:regions` regenerates `data/ph-regions.json` (the SVG region
  paths used by the interactive map).

Both generated files are checked in, so the app also runs against them without
first regenerating, and without any external services.

### Quality checks

```bash
npm run lint
npm run test
npm run build
```

`npm run test` runs the dependency-free Node test suite (`node --test`) covering
the region taxonomy, the seed-to-view adapter, the region/filter helpers, and
the generated region-map data.

## Sample data

The generated sample dataset is in [`data/athletes.json`](./data/athletes.json), and its dependency-free generator is in [`data/seed.mjs`](./data/seed.mjs). It contains 30 fictional adult athlete profiles across all 17 Philippine administrative regions. Each profile has an ID, fictional name, sport, adult age, height in centimeters, region code and name, province or locality, fictional bio and achievements, verification demo flag, mock funding goal and raised amount, funding progress, mock votes, and ranking.

The map renders all 18 regions, but the seed currently populates only 17; the
Negros Island Region (NIR) has no athletes yet and appears muted on the map.

Never replace seed examples with real athlete identities, contact details, proof documents, or payment information. Keep all demo funding and vote values clearly fictional.

See [`data/README.md`](./data/README.md) for the complete schema, regeneration instructions, and synthetic-data rules.

## Project principles

- Protect athletes' privacy; many athletes in the real world are minors.
- Use fake data only in source, screenshots, tests, and demos.
- Keep payments and payouts out of scope; funding values are mock examples.
- Keep the ranking formula public and documented if/when ranking behavior is implemented.
- Prefer small, understandable changes.

Read [`docs/PROJECT_BRIEF.md`](./docs/PROJECT_BRIEF.md) for the product direction and constraints.

## Contributing

Contributions are welcome. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md), follow the [`Code of Conduct`](./CODE_OF_CONDUCT.md), and review open changes in [`openspec/changes`](./openspec/changes).

## License

Startlete is available under the [MIT License](./LICENSE).
