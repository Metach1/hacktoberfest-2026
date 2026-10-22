# Startlete

Startlete helps supporters discover registered Filipino athletes and send
support directly using payment QR codes published by each athlete.

## How direct support works

- Athletes create an account, complete their profile, and publish GCash or Maya
  payment details from their dashboard.
- Only registered athlete accounts with at least one published payment QR
  appear in athlete discovery.
- Supporters scan the athlete's QR and send money using their own wallet app.
- A signed-in supporter can report the amount, method, and transfer reference.
  The athlete reviews the report and confirms or rejects it.

**Important:** Transfers happen outside Startlete. The app does not process,
hold, settle, or independently verify money. A supporter report is not proof
that funds were sent; an athlete confirmation is the recipient's assertion that
they received the transfer. This is not payment-provider or escrow integration.

## Features

- Supabase Auth accounts with supporter and athlete roles
- Supabase-backed athlete profiles, posts, QR payment details, and direct
  transfer reports
- Public discovery of registered athletes who have published payment details
- Search and sport/region filtering with the interactive Philippines map
- Athlete dashboard for managing QR details, profile, posts, and transfer
  reports
- Supporter dashboard for viewing transfer reports

## Getting started

Requirements: Node.js 20.19 or newer and npm.

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/` in order through
   `0012_create_athlete_profile_on_signup.sql`.
3. Copy `.env.example` to `.env.local` and set the Supabase project URL and
   public anon key.
4. Install and run:

```bash
npm install
npm run build:regions
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Do not run or restore the old seeded showcase data. Migration
`0009_remove_seeded_showcase_data.sql` deletes rows marked as seeded while
preserving rows owned by registered accounts. It must be applied to the
Supabase project to remove existing showcase records; changing application
code does not execute remote database migrations.

Athlete signup requires a location selected from the 18 Philippine regions.
Apply migration `0012_create_athlete_profile_on_signup.sql` so the signup
trigger saves the selected region and sport to the athlete's profile.

## Development checks

```bash
npm run lint
npm test
npm run build
```

The region map uses generated SVG paths in `data/ph-regions.json`. Regenerate
them with `npm run build:regions`; source and license details are documented in
[`data/geojson/SOURCE.md`](./data/geojson/SOURCE.md).

## Privacy and security

- Never commit `.env.local`, payment credentials, private athlete documents, or
  wallet secrets.
- Payment QR codes and account details are intentionally public when an athlete
  publishes them. Athletes should only publish accounts they want supporters to
  use.
- Supabase Row Level Security (RLS) protects owner-specific writes. The public
  anon key is expected in the browser; never expose a service-role key.

## Contributing

Contributions are welcome. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md),
follow the [`Code of Conduct`](./CODE_OF_CONDUCT.md), and review proposals in
[`openspec/changes`](./openspec/changes).

## License

Startlete is available under the [MIT License](./LICENSE).
