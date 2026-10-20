What it is

Startlete is an open source web platform that helps Filipino athletes get discovered and funded by region, merit, and need. Athletes create verified profiles, visitors discover them through an interactive Philippines map and a browse feed, and a community funding pool ("Startlete Grants") is allocated using a transparent ranking.

Formerly called "Star Athletes". Donors are called Starvestors.

Why it exists

Existing crowdfunding tools (GoFundMe, Patreon) tend to reward whoever is most popular online. Startlete weighs verified performance and financial need alongside community votes, and uses regional pride to connect athletes with local supporters.

Hard constraints (apply to every change)
Fake data only. Never include real athlete information. Many athletes are minors.
Mock donations only. No real payment processing, payouts, or payment credentials.
No secrets in the repo. Use environment variables and keep .env.example up to date.
Open source. MIT license. Keep the ranking formula public, documented, and in one file.
Keep changes small. One feature per OpenSpec change.
School comes first for the team, so favor simple solutions over clever ones.
Roles
Athlete: creates a profile, uploads proof, applies for grants once verified.
Starvestor: donates to the pool (mock), gives votes, browses athletes.
Admin: verifies proof, reviews reports, applies moderation outcomes.
Pages
Page	Purpose
Home / Map	Interactive SVG map of Philippine regions. Clicking a region (for example Region VII, Central Visayas) shows featured athletes from that region (Cebu, Bohol, Siquijor).
Browse	Search bar with filters (Basketball, Weightlifting, Esports, Track and Field, and so on). Grid of athlete cards showing sport, age, height, and funding goal percentage.
Startlete	Community pool summary, leaderboard, grant application (verified athletes only), vote button.
Profile	Athlete bio, sport, region, achievements, proof status, funding progress.
Admin	Verification queue and report queue.
Funding model

The central community pool is the core. Starvestors donate (mock) to the pool, and verified athletes apply for a Startlete Grant. Optional direct donations to a specific athlete may be added later, so browse cards can show a funding progress bar.

Ranking (draft - weights are placeholders)

Ranking score = 0.40 x performance + 0.35 x need + 0.25 x votes, with each signal normalized to 0-100 before weighting.

Signal	Weight	Source	Anti-abuse rule
Athletic performance	40%	Verified medals, stats, tournament wins	Only admin-verified entries count
Financial need	35%	Equipment and travel cost plus a supporting document	Document required (school or barangay certificate)
Fan votes / engagement	25%	Stars given by the community	Verified accounts only; capped per account, per athlete, per month

The formula lives in lib/ranking.ts with unit tests and is documented in the README.

Verification and moderation
Athlete profiles need proof: a certificate, tournament record, or coach / school endorsement. Proof earns a "Verified" badge.
Only verified athletes can apply for Startlete Grants.
Any user can report a profile or comment. Admin outcomes: dismissed, warning, content removed, account suspended.
Write docs/community-guidelines.md and a content moderation policy.
Tech stack
Next.js (App Router) + TypeScript (already scaffolded), ESLint
Styling: Tailwind CSS
Database: Prisma + SQLite (can move to Postgres later)
Auth: Auth.js with email login and roles
Map: plain SVG of Philippine regions (Leaflet only if needed)
Tests: Vitest
Specs and AI workflow: OpenSpec + GitHub Copilot
Folder structure
app/
  page.tsx                 Home map
  browse/page.tsx          Browse feed
  startletes/page.tsx      Ranking and pool
  athletes/[id]/page.tsx   Profile
  admin/                   Verification and reports
  api/                     Votes, reports, grants
components/                RegionMap, AthleteCard, FilterBar
lib/
  ranking.ts               The public ranking formula
  db.ts                    Database client
data/                      Fake seed athletes
docs/                      Brief, guidelines, moderation policy
openspec/                  Specs and change proposals
Data model (first draft)
Model	Main fields
User	id, email, role (athlete / starvestor / admin), createdAt
AthleteProfile	id, userId, name, sport, region, province, age, height, bio, verified, fundingGoal, fundingRaised
Proof	id, athleteId, type (certificate / record / endorsement), fileUrl, status
Vote	id, voterId, athleteId, month (unique per voter, athlete, month)
GrantApplication	id, athleteId, amountRequested, needScore, status
Report	id, reporterId, targetType, targetId, reason, outcome
Out of scope (for now)

Real payments and payouts, mobile app, chat and comments, automated verification of medals, legal and compliance work.

Open decisions
Pool only, or pool plus direct donations
Final ranking weights
Prisma + SQLite, or JSON seed data first
License: MIT or AGPL-3.0
Who acts as admin / verifier for the demo