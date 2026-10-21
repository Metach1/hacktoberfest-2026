# Tasks

## 1. Open-source onboarding

- [x] 1.1 Add the root MIT `LICENSE` and rewrite `README.md` as the Startlete project guide; verify it describes the app, prerequisites, setup and development commands, seed command, project constraints, and links to contributor guidance.
- [x] 1.2 Add `CONTRIBUTING.md` with validation and pull-request instructions and `CODE_OF_CONDUCT.md` with behavior, enforcement, and private reporting to the repository owner's GitHub contact method; verify the contact route is available before inviting contributors.
- [x] 1.3 Add a root `.env.example` explaining that the current app has no required environment variables and update `.gitignore` to unignore only `.env.example`; verify `.env.example` is not ignored and `.env.local` remains ignored with `git check-ignore`.

## 2. Fictional regional athlete data

- [x] 2.1 Add a deterministic, dependency-free seed script and npm command that write `data/athletes.json`; verify running the command produces exactly 30 unique adult profiles, covers all 17 administrative regions, validates required fields, and is idempotent.
- [x] 2.2 Update `app/data/startletes.ts` to source its demo profiles from the generated fictional dataset and remove real athlete identities and biographies; verify the demo maintains its existing typed screen data and contains no real athlete names.
- [x] 2.3 Document the synthetic dataset schema, generation command, and fake-data-only restrictions in the README and data folder; verify the documented command runs from a clean dependency install.

## 3. Integration verification

- [x] 3.1 Run the repository lint and production build after seed generation; verify both pass and all existing app routes continue to render using the synthetic fixtures.
