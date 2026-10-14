# Startletes UI Design Documentation

## Overview

Startletes is a fundraising and discovery platform for local athletes in the Philippines. The interface is designed to help users:

- discover athlete profiles by sport and location,
- browse promising athletes and funding campaigns,
- track rankings and funding momentum,
- manage a personal athlete profile and recent activity.

The design presented here is a polished dashboard-style experience built around a soft grey background, strong contrast typography, rounded cards, and a minimal navigation model.

## Product Goal

The product combines two core user experiences:

1. Discovery and browsing of athletes for supporters and fans.
2. Athlete visibility and fundraising tracking for verified athletes.

This makes the app feel like a lightweight sports crowdfunding and community support platform rather than a generic social feed.

## High-Level Page Structure

The interface includes four primary screens:

- Home / Dashboard
- Browse Athletes
- Ranking / Leaderboard
- Profile

Each screen shares the same design language:

- top header with brand name and utility actions,
- a large off-white page canvas,
- rounded cards with subtle borders,
- compact iconography and clean typography,
- a fixed bottom navigation bar for primary actions.

## Design System

### Color Palette

- Primary text: `#1f2a37`
- Secondary text: `#5c6878`
- Light background: `#f3f5f7`
- Card background: `#ffffff`
- Border: `#dfe5eb`
- Accent blue: `#2d9cdb`
- Accent blue dark: `#1f6fc9`
- Success green: `#19b97d`
- Warning amber: `#e7a43d`
- Error red: `#e05b5b`
- Dark navy: `#1d2430`

### Typography

- Primary font: modern sans-serif, clean and geometric
- Page titles: strong, bold, large weight
- Secondary labels: medium-weight with subdued opacity
- Numeric metrics: high emphasis with bold weight and generous spacing

### Layout Patterns

- Large content sections are enclosed in rounded containers.
- Cards use a soft border with minimal shadow and generous padding.
- Buttons are pill-shaped for consistency.
- Graphical map and image areas are framed with rounded corners and subtle elevation.

## Screen 1: Home / Dashboard

### Purpose

The home dashboard gives a quick overview of the ecosystem: athlete population, funding volume, and campaign activity.

### Layout

The page has:

- a header with the brand name `Startletes`, search icon, bell icon, and profile avatar,
- a large map panel in the middle with the Philippines silhouette,
- three summary cards below it:
  - Total Athletes
  - Funded Today
  - Active Campaigns
- a fixed bottom navigation bar.

### Map Panel

The map acts as a location-based discovery surface. It presents key athlete hotspots across the country, with round pin markers in blue and red.

Notable elements:

- map is placed inside a large rounded panel with off-white filling,
- location points are color-coded for prominence,
- one selected athlete pin is emphasized with a larger red badge and floating name label,
- labels like `Metro Manila` and `Davao` are visible as location callouts.

### Stats Cards

Each card is a compact metric block with:

- a title on the left,
- a large number in bold,
- a small trend indicator in green or neutral text.

Example values from the design:

- `Total Athletes` → `1,240` with `+12% this month`
- `Funded Today` → `₱45k` with `+5% vs yesterday`
- `Active Campaigns` → `84` with `+2% this week`

### User Experience Notes

This screen communicates a clear narrative:

- there are many athletes,
- supporters are funding them,
- activity is trending upward.

That creates the sense of a healthy, active platform.

## Screen 2: Browse Athletes

### Purpose

This is the discovery flow for users exploring athlete profiles by sport.

### Layout

The screen includes:

- top-level section title `Browse Athletes`,
- subtitle `Find your next favorite local champion.`,
- horizontal sport filter chips,
- three athlete cards in a row,
- bottom navigation bar shared with the rest of the product.

### Filter Chips

The chips show categories:

- All Sports
- Basketball
- Boxing
- Volleyball
- Weightlifting

The selected state uses a filled blue pill, while inactive chips use a light neutral background with subtle border.

### Athlete Cards

Each athlete card follows a consistent structure:

- large image area with rounded top corners,
- athlete name on the left,
- funding value on the right,
- sport label beneath the name,
- horizontal progress bar beneath the sport label,
- support percentage or completion indicator shown on the right side of the bar.

Examples in the design:

- `EJ Obiena` — `₱12,500` — Pole Vault — `35%`
- `Alyssa Valdez` — `₱8,200` — Volleyball — `50%`
- `Jordan Clarkson` — `₱45,000` — Basketball — `90%`

### Interaction Language

The progress bar is used as a visual signal of momentum and campaign success. It is a key trust signal for users deciding whom to support.

## Screen 3: Leaderboard

### Purpose

This screen ranks athletes by funding and support, establishing social proof and competitive momentum.

### Layout

The leaderboard appears as a table-like panel with columns:

- Rank
- Athlete
- Sport
- Votes
- Funding

### Leaderboard Entries

Rows are formatted as clean, card-like list items with:

- a round rank badge,
- circular profile avatar,
- athlete name and sport,
- support counts and funding totals,
- consistent spacing and alignment.

Example rows from design:

1. `EJ Obiena` — Pole Vault — `12,450 votes` — `₱85,000`
2. `Alyssa Valdez` — Volleyball — `9,200 votes` — `₱60,000`
3. `Jordan Clarkson` — Basketball — `8,100 votes` — `₱45,000`
4. `Hidilyn Diaz` — Weightlifting — `7,500 votes` — `₱40,000`

### Visual Behavior

The first row receives stronger emphasis with a gold/amber badge. This communicates ranking hierarchy without cluttering the layout.

## Screen 4: My Profile

### Purpose

This screen focuses on user trust, athlete identity, and campaign status. It acts as a personal hub for managing support and verifying profile completeness.

### Layout

It contains:

- profile summary card on the left,
- recent activity panel on the right,
- bottom nav across the width of the screen.

### Profile Card

The profile card shows:

- circular profile image,
- athlete name: `Juan Dela Cruz`,
- verified badge with green outline or label,
- metrics:
  - Total Funded: `₱120,000`
  - Backers: `842`
  - Ranking: `#12`
- primary CTA button: `Edit Profile`

### Recent Activity

The right panel is a timeline-like section with three entries:

- `Received funding from 12 new backers` — 2 hours ago
- `Moved up 3 spots in the ranking` — Yesterday
- `Profile verification approved` — 3 days ago

This adds credibility and reinforces platform activity.

## Navigation Model

The bottom navigation includes four items:

- Home
- Browse
- Ranking
- Profile

The selected state is visually highlighted with a darker icon/text treatment and a subtle active background, ensuring the interface remains intuitive and lightweight.

## Content and UX Principles

### 1. Trust First

The design uses verified badges, real numbers, and clear funding values to build credibility.

### 2. Clarity Over Complexity

Every screen focuses on one primary action: discover, rank, support, or manage a profile.

### 3. Strong Visual Hierarchy

Large titles, bold metrics, and selective accent colors help users navigate quickly.

### 4. Encouragement Through Progress

Funding bars and ranking data motivate continued engagement without overwhelming the user.

## Suggested Implementation Notes

The UI can be implemented as a responsive dashboard using a component structure like this:

- `AppShell`
- `TopBar`
- `StatCard`
- `MapPanel`
- `AthleteCard`
- `LeaderboardTable`
- `ProfileSummaryCard`
- `ActivityTimeline`
- `BottomNav`

This structure mirrors the design and makes future iteration easier.

## Acceptance Criteria for Implementation

The implementation should satisfy the following:

- page background uses a soft neutral grey with clean white cards,
- system uses a blue accent and high-contrast typography,
- all screens maintain consistent spacing and rounding,
- navigation is fixed and persistent across main screens,
- location markers and leaderboard metrics feel readable and scannable,
- athlete cards clearly convey funding progress and sport identity,
- profile and activity sections communicate verification and momentum.

## Summary

This design communicates a premium yet approachable athlete-support platform. It blends a data-rich dashboard with a community-driven fundraising experience, creating a strong `sports + social impact + discovery` product story.

The result is a clean and modern interface that is practical for end users while also visually polished enough to stand out in a hackathon or product demo environment.
