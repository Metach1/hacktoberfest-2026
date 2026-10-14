# Design

## Context

The project is a Next.js App Router and TypeScript scaffold. It has no database or environment-variable references, no `data/` directory, and no existing OpenSpec capabilities. The root `.gitignore` currently ignores every `.env*` file. The current UI fixtures in `app/data/startletes.ts` use real athlete identities, so the fake-data constraint also applies to those fixtures.

See `proposal.md` and the two capability specs for motivation and observable requirements.

## Goals / Non-Goals

**Goals:**

- Keep contributor onboarding concise and consistent with the project brief.
- Make synthetic data available to the existing demo through one generated JSON file.
- Keep seed generation dependency-free, repeatable, and independent of network or database services.
- Keep local secrets ignored while tracking the safe environment template.

**Non-Goals:**

- Adding Prisma, a database, authentication, real donations, or external data imports.
- Collecting real athlete data, profile proofs, contact details, or payment information.
- Defining the final ranking formula or expanding product features.

## Decisions

### Use a deterministic Node seed script and JSON output

Add a Node-native script under `data/` that validates a fixed synthetic profile set and writes `data/athletes.json`. Expose the script through an npm command and document it in the README. Re-running it overwrites the same generated output rather than appending records. Use fields needed by the demo and project brief, including fictional identity, sport, age, region, and province/locality; use funding and ranking metrics only as clearly synthetic demo values.

**Alternatives considered:** Adding a Prisma/SQLite seed would introduce a database and dependencies not present in this scaffold. Hand-editing only a JSON file would not provide the requested repeatable seed workflow.

### Make all demo athlete fixtures synthetic

Replace real athlete identities and biographies in `app/data/startletes.ts` with a small demo selection derived from the generated dataset. Keep UI-specific aggregate examples clearly synthetic and avoid introducing real photos or personal contact/proof information. Preserve the existing screens' expected presentation fields where possible.

**Alternatives considered:** Keeping the existing real identities would violate the project brief's hard fake-data constraint even if the new seed dataset were fictional. Removing the fixtures entirely would unnecessarily disrupt the existing demo.

### Spread profiles across all 17 administrative regions

Use region identifiers and names consistently for NCR, CAR, and the 15 numbered regions, with province/locality values appropriate to each region. Include at least one record per region and distribute the remaining records deterministically. Keep all generated athletes 18 or older to avoid unnecessary minor data in the initial public sample.

**Alternatives considered:** Sampling only a few regions would not fulfill the requested national coverage. Generating random region assignments would make outputs less reproducible and could omit regions.

### Keep onboarding files at repository root

Update the README as the project entry point and link to root `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`. Add a standard MIT `LICENSE`; use the repository owner `Metach1` as the copyright holder, based on the repository remote and configured Git identity. Include development commands, the seed command, project principles, and the no-real-payments/fake-data restrictions in the README.

For conduct concerns, direct contributors privately to the repository owner's GitHub profile contact method. The README or code of conduct must make clear that the owner must have a contact method available before the project invites contributors.

**Alternatives considered:** Introducing additional documentation tooling or a docs site is unnecessary for this small repository. Public issues are not suitable for confidential conduct reports.

### Track only safe environment configuration

Add a root `.env.example` with an explanation that the current scaffold requires no environment variables and that future variables must be documented there using placeholders only. Add a narrow `.gitignore` exception for `.env.example` while continuing to ignore actual local environment files.

**Alternatives considered:** Inventing unused database or authentication keys would misrepresent the current application. Removing the `.env*` ignore rule would risk committing local secrets.

## Risks / Trade-offs

- [Synthetic profiles may look authentic in screenshots] → Mark the seed data as fictional in the README and data file, use invented names and biographies, and avoid real athlete images or identifiers.
- [Region names or subdivisions may be inconsistent] → Keep region IDs/names explicit and validate that all 17 expected regions appear in the generated output.
- [The GitHub profile may not offer a private contact method] → Treat verifying the owner profile's contact method as a release prerequisite; do not route sensitive conduct reports through public issues.
- [Generated JSON could drift from demo expectations] → Keep the app fixture adapter typed and validate the seed output's record count and required fields through the seed script and checks.

## Migration Plan

No database migration is needed. Add the root documentation and environment template, generate the JSON seed file, update demo fixtures to use synthetic data, and verify the seed command, region coverage, ignore rules, lint, and build. Rollback consists of reverting these repository changes; no user data or external service state is affected.
