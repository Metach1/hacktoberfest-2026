# Startlete Backend

## Current architecture

Supabase Auth and Postgres are used for user accounts, profiles, athlete QR
details, posts, and direct-transfer reports. All writes use the browser's public
anon key and are constrained by Row Level Security (RLS); the app does not use
or expose a service-role key.

Athlete discovery reads registered `profiles` with role `athlete`, their
`athlete_profiles`, their public QR codes, and confirmed direct-transfer
reports. An athlete is listed only after publishing at least one QR code.
Public profile routes use the athlete account UUID.

## Direct QR transfers

Supporters scan an athlete's published QR in their own GCash/Maya wallet app.
After making a transfer, an authenticated supporter may submit the claimed
amount, payment method, and transaction reference. The transfer report is
stored in `public.donations` with `status = 'pending'`. The receiving athlete
can review it in their dashboard and confirm or reject it.

This is not payment processing. Startlete does not initiate, hold, settle, or
verify transfers, and a supporter-submitted report is not proof that money was
sent. Only an athlete's confirmation changes the public confirmed totals.

## Security and visibility

- Athlete names, profile details intended for public display, and published QR
  details are publicly readable.
- Supporters can read their own reports; athletes can read reports addressed to
  them; only confirmed report totals are used publicly.
- A supporter cannot submit a report as another user, to a supporter account,
  or to their own account.
- Only the recipient athlete may confirm or reject a pending report. Database
  policies and a transition trigger protect its immutable amount, recipient,
  supporter, method, and reference.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured
  locally in `.env.local`. Never expose a service-role key.

## Migrations

Apply files in numeric order in the Supabase SQL editor or with the Supabase
CLI:

| Migration | Purpose |
| --- | --- |
| `0001_init.sql` | Profiles, athlete profile basics, core social tables, signup trigger. |
| `0002_rls.sql` | Initial row-level access policies. |
| `0003_feature_schema.sql` | QR codes and donation lifecycle fields. |
| `0004_feature_rls.sql` | QR and donation policies. |
| `0006_full_backend.sql` | User-owned social, QR, and donation schema. |
| `0007_full_backend_rls.sql` | Ownership-enforcing policies. |
| `0008_qr_account_number.sql` | Athlete payment account display field. |
| `0009_remove_seeded_showcase_data.sql` | Delete seeded fictional catalog and showcase records. |
| `0010_direct_transfer_controls.sql` | Restrict direct-transfer reporting and review transitions. |
| `0011_reconcile_athlete_profiles.sql` | Add athlete profile columns skipped when `0006` encountered the table created by `0001`. |
| `0012_create_athlete_profile_on_signup.sql` | Save athlete region and sport from signup metadata into `athlete_profiles`. |
| `0013_profile_picture_storage.sql` | Configure public profile-image storage and restrict uploads/changes to each user's own folder. |

Migration `0009` removes only rows marked as seeded (including seeded profiles)
and associated showcase records; it preserves rows owned by registered
accounts. Applying migrations is an explicit database operation; code changes
do not run them against a hosted Supabase project. Apply through `0013` before
using the current app. Migration `0011` adds the missing `bio`, `achievement`,
`created_at`, and `updated_at` columns to `athlete_profiles` on existing
databases; `0012` updates the signup trigger to create an athlete profile with
the selected region and sport; `0013` creates the public profile-image bucket
and owner-only write policies. See the [profile pictures guide](./PROFILE_IMAGES.md)
for upload behavior and privacy details.

The signup trigger creates `profiles` rows. Athlete-specific profile fields
are managed in `athlete_profiles`; payment QR details are managed in
`qr_codes`; transfer reports are stored in `donations`.

## Related code

- `src/app/lib/supabase/client.ts` — browser Supabase client
- `src/app/shared/session-provider.tsx` — auth session and role
- `src/app/services/auth.ts` — sign-up, sign-in, sign-out
- `src/app/services/profile.ts` — signed-in profile reads and updates
- `src/app/services/public-athletes.ts` — public athlete directory and QR reads
- `src/app/services/qr.ts` — athlete-owned QR management
- `src/app/services/donations.ts` — supporter reports and athlete review
- `src/app/services/feed.ts` — social feed
