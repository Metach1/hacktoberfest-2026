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

```text
app/
  layout.tsx                 Global document, fonts, metadata, and global styles
  page.tsx                   Home route
  browse/page.tsx            Browse route entrypoint
  leaderboard/page.tsx       Leaderboard route entrypoint
  login/page.tsx             Login route entrypoint
  profile/page.tsx           Profile route entrypoint
  data/startletes.ts         Typed adapter from seed JSON to UI view data
src/
  feat/
    browse/
      page.tsx               Browse feature entrypoint
      model/browse.ts        Browse feature model
      ui/browse-screen.tsx   Browse screen
    leaderboard/
      page.tsx               Leaderboard feature entrypoint
      model/leaderboard.ts   Leaderboard feature model
      ui/leaderboard-screen.tsx Leaderboard screen
    login/
      page.tsx               Login feature entrypoint
      model/login.ts         Login credential type
      ui/login-screen.tsx    Login screen
    profile/
      page.tsx               Profile feature entrypoint
      model/profile.ts       Profile feature model
      ui/profile-screen.tsx  Profile screen
  lib/
    browse/browse-api.ts     Browse and athlete lookup API
    leaderboard/leaderboard-api.ts Leaderboard query API
    profile/profile-api.ts   Demo profile overview API
components/
  startletes-shell.tsx       Shared page frame, header, and route navigation
  startletes-sections.tsx    Home dashboard and shared home sections
data/
  athletes.json              Generated fictional profiles used by the app
  seed.mjs                   Deterministic generator and data validation
public/
  philippines-map.svg        Local map illustration
  athlete-placeholder.svg    Generic artwork; not a real athlete photo
```

The `app/` route files are entrypoints that delegate to the matching feature page in `src/feat/`; the home route uses `HomeDashboard` directly, and login is a standalone screen. Browse, leaderboard, and profile pages compose their screens inside `StartletesShell`. Their feature models call the corresponding feature-named API modules under `src/lib/`. The browse and leaderboard APIs use the typed view data from `app/data/startletes.ts`, which adapts the generated dataset to the fields the screens use; the profile API provides illustrative account data. The home map and generic profile artwork are local SVG assets, so the demo does not depend on remote images.

The current browse filter chips and header action buttons are visual controls only. The map markers are positioned visual examples, not a complete regional search workflow. The sample profile statistics and activity feed are illustrative UI values rather than account-backed data.

## Sample-data flow

1. Run `npm run seed` from the repository root.
2. `data/seed.mjs` writes a deterministic `data/athletes.json` file. It validates the dataset, including profile count, required fields, unique identities, adult ages, and coverage of all 17 Philippine administrative regions.
3. `app/data/startletes.ts` imports the JSON and maps each profile to the typed `Athlete` view shape.
4. The browse and leaderboard feature models use their APIs under `src/lib/` to query those profiles; the leaderboard sorts them by seeded ranking. The profile model reads the demo overview from its feature API.

The generated file is checked in, so the app can run without first regenerating it. The seed command overwrites it with the same fictional records; it does not fetch external data or append records. See the [sample-data guide](../data/README.md) for the complete schema and safety rules.

## Run locally

Requirements: Node.js 20.19 or newer and npm.

```bash
npm install
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The available screens are:

| Route | Screen |
| --- | --- |
| `/` | Home dashboard and Philippines map illustration |
| `/browse` | Fictional athlete cards |
| `/leaderboard` | Seeded sample rankings |
| `/profile` | Illustrative athlete profile and activity |

No environment variables are required by the current app. `.env.example` is provided as a safe placeholder for future documented configuration; do not commit local secrets.

## Validate changes

Run the repository's current checks before opening a pull request:

```bash
npm run lint
npm run build
```

The production build checks that the application compiles and that all App Router pages can be built. The project does not currently define a separate automated unit- or browser-test command.

## Contributing and future development

Read [CONTRIBUTING.md](../CONTRIBUTING.md) before changing the project and follow the [Code of Conduct](../CODE_OF_CONDUCT.md). For scoped product changes, review the OpenSpec proposals in [`openspec/changes`](../openspec/changes) and keep implementation aligned with the project brief.

Database persistence, authentication, verification workflows, real donations, and payouts are not implemented. Do not add them implicitly as part of a UI task. Any future implementation must be planned explicitly and must preserve the brief's fake-data, privacy, and no-real-payments constraints.
