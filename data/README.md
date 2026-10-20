# Fictional athlete seed data

`athletes.json` is development/demo data only. Every profile, biography, achievement, vote count, and funding value is fictional. It must not be replaced with real athlete data or real personal, verification, or payment information.

## Generate the dataset

From the repository root, run:

```bash
npm run seed
```

This runs the dependency-free generator in [`seed.mjs`](./seed.mjs) and overwrites `athletes.json` with the same deterministic 30-profile dataset each time. The script validates the profile count, unique identities, adult ages, required fields, and coverage of all 17 Philippine administrative regions that the seed populates.

## Region map data

The interactive Philippines map on the Discover page is driven by
[`ph-regions.json`](./ph-regions.json), a generated set of static SVG paths for
the 18 Philippine administrative regions. Regenerate it from the repository root
with:

```bash
npm run build:regions
```

This runs [`build-regions.mjs`](./build-regions.mjs), which reads the committed
GeoJSON in [`geojson/`](./geojson), resolves each region to a canonical code via
the shared taxonomy in [`regions.mjs`](./regions.mjs), projects the geometry to
the app's `0 0 300 470` viewBox, and writes one `{ regionCode, name, svgPath }`
entry per region. The script fails if any region does not resolve or if the
18-region coverage is incomplete.

- **GeoJSON source and license:** see [`geojson/SOURCE.md`](./geojson/SOURCE.md).
  The boundaries come from a public, MIT-licensed dataset and carry no personal
  data.
- **18 vs. 17:** the map renders all 18 regions. The athlete seed populates 17;
  the Negros Island Region (NIR) has no athletes yet and renders muted.

### `ph-regions.json` shape

| Field | Description |
| --- | --- |
| `description` | Human-readable note about the file and its source |
| `viewBox` | SVG viewBox the paths are projected into (`0 0 300 470`) |
| `regions[]` | One entry per administrative region |
| `regions[].regionCode` | Canonical region code (NCR, CAR, Region I–XIII, BARMM, NIR) |
| `regions[].name` | Full administrative region name |
| `regions[].svgPath` | SVG path `d` string for the region outline |

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

The Next.js demo imports this file through the typed adapter at
[`src/app/data/athletes.ts`](../src/app/data/athletes.ts), which maps each seed
record to the UI view shape. No database or external service is needed.

## Safety rules

- Use fake data only in source, screenshots, issues, tests, and demos.
- Do not include real athlete names, bios, photos, contact details, or identifying information.
- Do not include real verification proofs or payment credentials.
- Funding and votes are illustrative only. The project does not process donations, payments, or payouts.
- Keep seed ages at 18 or older; do not add minors to the public sample dataset.
