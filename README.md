# Startlete

Startlete is an open-source demo platform concept for helping Filipino athletes get discovered and funded by region, merit, and need. The current Next.js app demonstrates athlete discovery, a Philippines map, browsing, a leaderboard, and an athlete profile.

> **Demo safety:** All athlete records and funding figures must be fictional. Funding and voting are illustrative only: this project does not process payments, transfer funds, or provide payouts. Do not add real athlete information, personal documents, credentials, or payment details.

## Features

- Landing page, athlete discovery, athlete profile, dashboards, and a simulated donation flow
- **Interactive Philippines map on Discover** — click a region to see the athletes training there (see below)
- Athlete browse cards with search, sport, and region filtering
- Community posts with moderated image uploads and a local review queue
- Fictional, repeatable seed data for development and demos (30 athletes across the regions)

The current interface is a frontend prototype. Login is a demo role picker,
verification and real funding are not implemented, and post data remains in
browser localStorage. Post image uploads use development-only server routes
and local disk storage; they are disabled in production.

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

`npm run test` runs the Node test suite (`node --test`) covering
the region taxonomy, the seed-to-view adapter, the region/filter helpers, the
generated region-map data, the donation lifecycle and claimed-amount helpers,
the receipt-text parser, the EMVCo / QR Ph payment-QR validator, the donation
reject lifecycle and supporter/athlete scoping, the receipt-upload filter
(accept / reject / uncertain) policy, the public-profile confirmed-donation
display and donor-ranking helpers, and the image-aspect-ratio CSS guard.

## Sample data

The generated sample dataset is in [`data/athletes.json`](./data/athletes.json), and its dependency-free generator is in [`data/seed.mjs`](./data/seed.mjs). It contains 30 fictional adult athlete profiles across all 17 Philippine administrative regions. Each profile has an ID, fictional name, sport, adult age, height in centimeters, region code and name, province or locality, fictional bio and achievements, verification demo flag, mock funding goal and raised amount, funding progress, mock votes, and ranking.

The map renders all 18 regions, but the seed currently populates only 17; the
Negros Island Region (NIR) has no athletes yet and appears muted on the map.

Never replace seed examples with real athlete identities, contact details, proof documents, or payment information. Keep all demo funding and vote values clearly fictional.

See [`data/README.md`](./data/README.md) for the complete schema, regeneration instructions, and synthetic-data rules.

## Payments: receipts, review, and upload filtering

The supporter donation flow is QR-based and deliberately offline: a supporter
scans an athlete's published QR, pays in their own wallet app, then uploads the
receipt and enters the amount. Donations are recorded as **pending** until the
athlete **confirms** them (or a 3-day demo auto-confirm timeout elapses). The
athlete can also **reject** a pending donation with a reason (amount mismatch,
invalid receipt, wrong image, or other) and an optional note, which the
supporter sees on their rejected payment. Rejected and pending donations never
count toward an athlete's confirmed totals or supporter count, and a donation
can never be both confirmed and rejected.

When reviewing a pending receipt, the athlete can open the uploaded image at
**full size** in a popup (modeled on the full-size QR viewer): large images fit
the viewport and it dismisses via close button, outside click, or Escape. The
confirm and reject controls stay available throughout the review, and a
donation with no receipt image is handled gracefully (no viewer is offered).

Each row in the supporter's **My payments** has a three-dot (⋮) actions menu,
gated by status: a **rejected** donation offers **View**, **Edit & resubmit**,
and **Delete**; a **pending** donation offers **View** and **Delete**; a
**confirmed** donation offers **View** only. Confirmed donations are never
editable or deletable, so an athlete's confirmed totals can't be changed from
here. **View** opens a read-only detail (amount, athlete, method, reference,
date, status, rejection reason/note, and the receipt image if present).
**Delete** asks for confirmation and removes only the owning supporter's
pending/rejected donation. The menu dismisses on outside click or Escape.

**Edit & resubmit** reopens the donation flow prefilled with the rejected
submission's details; the supporter can edit any field and attach a replacement
receipt (which re-runs the same validation/OCR filtering). Resubmitting updates
the **same** donation record in place — its id, athlete, and supporter are
preserved — returning it to **pending**, clearing the stale rejection metadata,
and restarting the auto-confirm timing. Only the owning supporter can retry, a
donation can't be retried once confirmed, and because it stays one record it is
counted at most once in an athlete's totals.

Both dashboards show payment history: the athlete sees **Recent payments**
(confirmed, pending, rejected, with the rejection reason) and the supporter sees
**My payments** scoped to their own submissions.

Each athlete's **public profile** shows a GoFundMe-style donations section next
to the fundraising progress: the five latest **confirmed** donations inline
(donor name, amount, date), the confirmed-donation count, and a clear empty
state. A **See all** popup lists every confirmed donation; a **See top** popup
ranks contributors by their total confirmed contribution. Pending and rejected
donations — and receipts — are never shown here. Donor identities come from the
name entered on each donation; the display ranking groups **named** donors by
that exact name and never merges different names or splits a shared one. Because
the demo has no real accounts, it cannot tell one anonymous supporter from
another, so anonymous donations are **not** grouped: each confirmed anonymous
donation is ranked as its own "Anonymous supporter" row (its own amount, count
of 1) rather than claiming they are the same person — a known demo identity
limitation. All donations popups are mobile-friendly and dismissible via
close button, outside click, or Escape.

> **Identity limitation.** The demo has a single supporter identity
> (`SUPPORTER_ID`); it has no real accounts or login. "My payments" is scoped to
> that one identity so it never shows another supporter's data, but the demo
> cannot distinguish multiple real supporters. This is the safest compatible
> behavior for the current model, not multi-user isolation.

### Post image uploads and moderation

- A post can include at most **4 images**, each at most **5 MiB**. The server
  accepts JPG, PNG, and WebP based on decoded file content, re-encodes them to
  strip metadata, and generates random filenames.
- Images are checked by the server before storage. The default is
  [NSFWJS](https://github.com/infinitered/nsfwjs), a free, open-source
  TensorFlow.js model that requires no paid key. The strict moderation
  thresholds are centralized in `src/app/lib/moderation-config.mjs`. Explicit
  content is rejected; borderline results, errors, and timeouts are held
  privately for admin review.
- The server limits the demo account to **5 upload attempts per 15 minutes**.
  Repeated rejections are flagged in the admin queue. Users can report posts
  and images; admins can approve/reject pending images or apply the report
  outcomes dismissed, warning, content removed, and account suspended.
- Optional hosted moderation can be configured using
  `IMAGE_MODERATION_API_URL` and `IMAGE_MODERATION_API_KEY`. It is not enabled
  by default and sends the image to the configured provider; see
  [`docs/design.md`](./docs/design.md) for the provider comparison and response
  contract.

Uploaded files, report records, and moderation logs are stored in the ignored
`uploads/` directory **for local development only**. Do not use local file
storage in production; the upload APIs are disabled when `NODE_ENV=production`.
The login remains a browser demo role picker, so its signed cookie only supports
local UX and is not real authentication. Set `DEMO_ADMIN_TOKEN` in `.env.local`
to access `/admin`. Real auth, durable storage, account-level rate limiting,
and admin authorization must be added before deployment.

Receipt OCR and QR decoding remain client-side. Receipt image content is
screened through the same server moderation function before it can be attached
to a donation. Uncertain receipts stay private from the athlete; moderation and
OCR do not prove a payment occurred, and the demo never processes payments.

Read [`docs/community-guidelines.md`](./docs/community-guidelines.md) and
[`docs/moderation-policy.md`](./docs/moderation-policy.md) for the content rules.

- Use fake data only in source, screenshots, tests, and demos.
- Keep payments and payouts out of scope; funding values are mock examples.
- Keep the ranking formula public and documented if/when ranking behavior is implemented.
- Prefer small, understandable changes.

Read [`docs/PROJECT_BRIEF.md`](./docs/PROJECT_BRIEF.md) for the product direction and constraints.

## Contributing

Contributions are welcome. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md), follow the [`Code of Conduct`](./CODE_OF_CONDUCT.md), and review open changes in [`openspec/changes`](./openspec/changes).

## License

Startlete is available under the [MIT License](./LICENSE).
