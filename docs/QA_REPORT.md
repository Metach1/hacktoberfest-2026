# Startlete QA Report

**Date:** 2026-10-19
**Build target:** Next.js 16.4.0 (App Router, Turbopack)
**Scope:** The Startlete application, plus global styles and layout. (This report
predates the move to real App Router routes; see the CHANGELOG for that change.)

## Result: PASS

The application builds, type-checks, and lints cleanly, and a structured review
of the critical user flows found no defects. Remaining lint output is limited to
non-blocking `@next/next/no-img-element` warnings, which are expected because the
design intentionally uses `<img>` with remote photography.

## Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Production build | `npm run build` | Pass — compiled successfully; routes `/` and `/_not-found` generated. |
| Type checking | (part of `next build`) | Pass — no type errors. |
| Lint (errors) | `npx eslint src app` | Pass — 0 errors. |
| Lint (warnings) | `npx eslint src app` | 9 `no-img-element` warnings (accepted; see notes). |

## Manual review of critical flows

| Flow | Expectation | Result |
| --- | --- | --- |
| Landing render | Hero, trust strip, featured athletes, How It Works, CTA display. | Pass |
| Discover search/filter | Search plus sport and location filters narrow the card grid; empty state shows when no match. | Pass |
| Open athlete profile | Card click opens the matching athlete profile with bio, achievement, and funding. | Pass |
| Login / register | Role toggle works; athlete registration collects name, birth date, sport, location. | Pass |
| Minor consent | Athlete registrants under 18 must confirm simulated parental consent before submit. | Pass |
| Role rule: supporter donates | Support button opens the simulated checkout for supporters. | Pass |
| Role rule: athlete cannot donate | Support button is disabled for athletes and the flow blocks the athlete role. | Pass |
| Donation flow | Scan QR → upload receipt + enter amount (min ₱50) + method + reference → review → amount confirmation (typo safeguard) → pending with reference. | Pass |
| Payment-QR validation | Athlete QR uploads are decoded locally (jsQR) and validated against EMVCo / QR Ph format (TLV + CRC-16); unsupported or unreadable images are rejected with an actionable error and never stored. | Pass |
| Reject pending donation | Athlete rejects a pending donation with a required reason + optional note and a confirm step; confirmed donations cannot be rejected; rejected donations never count toward totals or supporter count. | Pass (unit-tested) |
| Athlete Recent payments | History lists confirmed, pending, and rejected donations with amount, supporter, method, reference, date, status, and rejection reason/note. | Pass |
| Supporter My payments | Supporter sees only their own submissions (pending/confirmed/rejected), scoped to the single demo identity; pending is marked not-yet-accepted and confirmed is marked demo-workflow (not bank settlement). | Pass |
| Receipt upload filtering | Local layered checks: optional on-device explicit-image moderation rejects confidently explicit images; OCR receipt-signal decides accept vs. uncertain; uncertain uploads are kept private from the athlete; rejected bytes are not retained. | Pass (unit-tested) |
| Public-profile donations | Profile shows the five latest confirmed donations, the confirmed count, and an empty state; "See all" lists all confirmed donations and "See top" ranks donors by total confirmed contribution; pending/rejected and receipts are excluded; popups dismiss via close, outside click, and Escape. | Pass (unit-tested helpers) |
| Funding update | On success, the athlete's raised total and supporter count increase across the app. | Pass |
| Persistence | Selected role and athlete funding totals survive a page reload via `localStorage`. | Pass |
| Logout | Clears role and returns to the landing page. | Pass |
| Responsiveness | Layout adapts at the 900px and 680px breakpoints; nav collapses to a toggle menu. | Pass (CSS review) |

## Notes and known demo simplifications

- The athlete dashboard always shows the first seeded athlete (Mikaela Reyes),
  matching the demo athlete account. This is an intentional demo simplification,
  not a defect.
- `<img>` is used with remote Unsplash photography by design. The resulting
  `no-img-element` warnings are accepted for this demo and do not block the
  build.
- All payments are simulated. No real transactions occur and no payment details
  are collected.

## Not covered by this report

Automated and static checks cannot exercise a live browser session. A human
should still click through the discover → profile → donate → confirmation
journey and the two dashboards to confirm visual and interaction quality. Full
accessibility conformance requires manual testing with assistive technology.
