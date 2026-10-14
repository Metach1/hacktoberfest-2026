# Fictional athlete seed data

`athletes.json` is development/demo data only. Every profile, biography, achievement, vote count, and funding value is fictional. It must not be replaced with real athlete data or real personal, verification, or payment information.

## Generate the dataset

From the repository root, run:

```bash
npm run seed
```

This runs the dependency-free generator in [`seed.mjs`](./seed.mjs) and overwrites `athletes.json` with the same deterministic 30-profile dataset each time. The script validates the profile count, unique identities, adult ages, required fields, and coverage of all 17 Philippine administrative regions.

## Dataset shape

The JSON file contains a top-level `description` and an `athletes` array. Each athlete has:

| Field | Description |
| --- | --- |
| `id` | Stable unique synthetic profile ID |
| `name` | Fictional athlete name |
| `sport` | Example sport |
| `age` | Synthetic adult age, 18 or older |
| `heightCm` | Synthetic height in centimeters |
| `regionCode` | Philippine region code (NCR, CAR, Region I–XIII, or BARMM) |
| `region` | Full administrative region name |
| `provinceOrLocality` | Fictional profile's sample province or locality |
| `bio` | Fictional short biography |
| `achievements` | Fictional achievements, explicitly labeled as examples |
| `verified` | Mock verification state for the demo |
| `fundingGoal` | Mock funding goal in Philippine pesos |
| `fundingRaised` | Mock raised amount in Philippine pesos |
| `fundingProgress` | Raised-to-goal percentage |
| `votes` | Mock community vote count |
| `ranking` | Deterministic sample ranking based on votes |

The Next.js demo imports this file through [`app/data/startletes.ts`](../app/data/startletes.ts). No database or external service is needed.

## Safety rules

- Use fake data only in source, screenshots, issues, tests, and demos.
- Do not include real athlete names, bios, photos, contact details, or identifying information.
- Do not include real verification proofs or payment credentials.
- Funding and votes are illustrative only. The project does not process donations, payments, or payouts.
- Keep seed ages at 18 or older; do not add minors to the public sample dataset.
