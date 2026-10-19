# Changelog

All notable changes to Starlete are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow semantic versioning once it reaches a release.

## [Unreleased]

### Added

- Starlete single-page application (`src/app/starlete-app.tsx`) with internal
  page routing: landing, discover, athlete profile, login, register, supporter
  dashboard, athlete dashboard, edit profile, and a multi-step donation flow.
- Modern sports-community visual design (navy / blue / gold / white, Inter) in
  `app/globals.css`.
- Role-based experience: supporters can discover and donate; athletes manage a
  profile, verification status, funding progress, donations, and posts.
  Athletes cannot donate.
- Simulated donation checkout: preset or custom peso amounts, GCash / Maya /
  card / bank methods, review, processing, and success steps that update
  funding totals. No real payments are processed.
- Athlete registration collects name, birth date, sport, and location, with
  simulated parental consent required for minors.
- Client-side state persistence to `localStorage` (selected role and athlete
  funding totals survive reloads).
- QA report in `docs/QA_REPORT.md` covering build, type, lint, and a manual
  review of the critical user flows.

### Changed

- Replaced the earlier multi-route prototype and the earthy/editorial redesign
  with the Starlete single-app experience mounted at `/`.
- Switched the app font to Inter.

### Removed

- Obsolete route directories and feature modules from the previous prototype
  (`/browse`, `/login`, `/signup`, `/dashboard/*`, `/athletes/*`,
  `/leaderboard`, `/profile`, `/starletes`, `/admin`, `/welcome`) and their
  supporting `src/feat`, `src/lib`, `src/state`, and `components` files.
