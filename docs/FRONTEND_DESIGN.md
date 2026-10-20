# Starlete Frontend Design

Starlete is a responsive web app for funding Filipino athletes. The frontend is
a single client application that manages its own in-app navigation. This
document describes the shipped UI, the design language, and how the screens
connect.

> **Demo safety.** Every athlete, photo, funding figure, and donation is
> fictional or illustrative. Starlete does not process real payments; the
> checkout is fully simulated.

## Architecture

The entire experience is one client component, `src/app/starlete-app.tsx`,
mounted at the root route (`app/page.tsx`). It holds page state (`home`,
`discover`, `profile`, `login`, `register`, `dashboard`, `edit`) and renders the
matching screen. This keeps the connected journey — discover → profile → donate
→ confirmation — instant and stateful without a backend.

State is persisted to `localStorage`:

- `starlete-role` — the signed-in demo role (`supporter` or `athlete`).
- `starlete-athletes` — athlete records, so donation totals survive reloads.

Styling lives in `app/globals.css` as plain class-based CSS (not utilities), so
the look is self-contained and portable.

## Design language

- **Palette:** deep navy (`--navy #071c34`) base, vivid blue (`--blue #1558d6`)
  for primary actions, gold (`--gold #f5bf39`) for accents and highlights, white
  and cream surfaces.
- **Type:** Inter, with tight letter-spacing on headings.
- **Shape:** rounded cards (14–20px radius), soft shadows, pill buttons.
- **Imagery:** athlete photography in cards, hero, and profiles.

## Screens

| Screen | Audience | Purpose |
| --- | --- | --- |
| Landing (`home`) | Everyone | Hero headline, trust strip, featured athletes, How It Works, CTA. |
| Discover | Everyone | Search plus sport and location filters over a card grid. |
| Athlete profile | Everyone | Photo, bio, achievement, funding panel, updates, Support button. |
| Login / Register | Visitors | Role toggle (Supporter / Athlete); athlete fields + minor consent. |
| Supporter dashboard | Supporter | Picked-for-you athletes, trending, funding leaderboard, impact. |
| Athlete dashboard | Athlete | Verification status, funds, goal, supporters, donations, posts, Create Post. |
| Edit profile | Signed-in | Update name, location, bio, and (athlete) sport and goal. |
| Donation flow (modal) | Supporter | Amount → payment method → review → processing → success. |

## Role rules

- Supporters can donate to athletes through the simulated checkout.
- Athletes cannot donate; the Support button is disabled on profiles and the
  flow blocks the athlete role.
- Minors registering as athletes must confirm simulated parental consent.

## The connected journey

1. A supporter discovers an athlete on the landing or Discover screen.
2. They open the athlete profile and read the story and funding progress.
3. They choose an amount and a simulated payment method, review, and confirm.
4. A success screen shows a reference, and the athlete's raised total and
   supporter count update immediately across the app.

## Responsiveness

The layout adapts at 900px and 680px breakpoints: the hero and grids collapse to
one or two columns, the top navigation becomes a toggle menu, and the donation
modal docks to the bottom of the screen on small devices.

## Components (within `starlete-app.tsx`)

`Icon`, `Logo`, `Progress`, `AthleteCard`, `Header`, `Landing`, `Discover`,
`AthleteProfile`, `Auth`, `SupporterDashboard`, `AthleteDashboard`,
`EditProfile`, and `Donation`.
