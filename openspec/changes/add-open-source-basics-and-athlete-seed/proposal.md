# Proposal

## Why

Startlete needs clear, trustworthy open-source onboarding and a safe, reusable dataset for development and demos. The current repository has only a minimal README, ignores all `.env*` files, has no seed-data tooling, and its sample athlete data uses real public athlete identities, contrary to the project brief's fake-data-only constraint.

## What Changes

- Add the MIT license and contributor-facing README, contribution guide, and code of conduct.
- Add a tracked `.env.example` and adjust `.gitignore` so local environment files remain ignored while the example is committed.
- Add a dependency-free seed script and generated JSON containing 30 fully fictional adult athlete profiles distributed across all 17 Philippine administrative regions.
- Replace real athlete identities in existing demo fixtures with fictional sample profiles so the UI and seed data honor the fake-data-only project constraint.

## Capabilities

### New Capabilities

- `contributor-onboarding`: Provide the license, project setup and usage guidance, contribution process, conduct expectations, and safe environment-variable example needed to participate in the open-source project.
- `sample-athlete-data`: Provide deterministic, fictional athlete seed data and tooling that can be used by the demo without exposing real athlete identities or personal information.

### Modified Capabilities

None.

## Impact

- Repository documentation and license: `README.md`, `LICENSE`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md`.
- Environment setup and ignore rules: `.env.example` and `.gitignore`.
- Sample data and existing demo fixtures: `data/` and `app/data/startletes.ts`.
- No database, payment integration, external data source, or runtime dependency is introduced. The seed output is JSON because the project currently has no database layer and the project brief lists JSON seed data as an open option.
