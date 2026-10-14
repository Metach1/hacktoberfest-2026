# Startletes

Startletes is an open-source demo platform concept for helping Filipino athletes get discovered and funded by region, merit, and need. The current Next.js app demonstrates athlete discovery, a Philippines map, browsing, a leaderboard, and an athlete profile.

> **Demo safety:** All athlete records and funding figures must be fictional. Funding and voting are illustrative only: this project does not process payments, transfer funds, or provide payouts. Do not add real athlete information, personal documents, credentials, or payment details.

## Features

- Home dashboard with a Philippines map and platform summary cards
- Athlete browse cards and a sample leaderboard
- Athlete profile and recent-activity views
- Fictional, repeatable seed data for development and demos

The current interface is a frontend prototype. Authentication, verification, real funding, and persistent user data are not implemented.

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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app. `npm run seed` regenerates `data/athletes.json`; the app can also run against the checked-in seed file without external services.

### Quality checks

```bash
npm run lint
npm run build
```

## Sample data

The generated sample dataset is in [`data/athletes.json`](./data/athletes.json), and its dependency-free generator is in [`data/seed.mjs`](./data/seed.mjs). It contains 30 fictional adult athlete profiles across all 17 Philippine administrative regions. Each profile has an ID, fictional name, sport, adult age, height in centimeters, region code and name, province or locality, fictional bio and achievements, verification demo flag, mock funding goal and raised amount, funding progress, mock votes, and ranking.

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

Startletes is available under the [MIT License](./LICENSE).
