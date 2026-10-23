# Profile media & achievements — data model

Startlete currently runs client-only: the fictional seed plus a `localStorage`
store (`src/app/store.tsx`). There is no database, API, or server upload. Photos
are stored as in-browser **data URLs**, exactly like the existing QR-code and
donation-receipt "uploads". This document captures the **future** relational
model so a backend can be added without reshaping the app's data.

When a real backend lands (the project brief lists "Prisma + SQLite, or JSON
seed data first" as an open decision), these are the migrations to add. The
`@@unique`/partial-index notes enforce "exactly one proudest achievement per
athlete" at the database level.

```prisma
// prisma/schema.prisma (sketch — not yet wired; no DB in the demo)

model AthleteProfile {
  id           String         @id @default(cuid())
  // ...existing fields (name, sport, region, bio, fundingGoal, verified, ...)
  photos       AthletePhoto[]
  achievements Achievement[]
}

model AthletePhoto {
  id        String         @id @default(cuid())
  athlete   AthleteProfile @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  athleteId String
  // Safe, server-generated file name (never the client-supplied name).
  fileName  String
  // Object-storage URL/key in production (data URL in the demo).
  url       String
  alt       String
  // 0 = profile picture. Reordering updates this; the lowest order wins.
  order     Int

  @@index([athleteId, order])
}

model Achievement {
  id          String         @id @default(cuid())
  athlete     AthleteProfile @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  athleteId   String
  title       String         // required, <= 80 chars (validate app + DB)
  event       String?        // competition / meet, <= 80 chars
  date        DateTime?      // must not be in the future (validate app-side)
  description String?        // <= 280 chars
  isProudest  Boolean        @default(false)
  verified    Boolean        @default(false) // reserved; not surfaced yet

  // "At most one proudest per athlete": a partial unique index on
  // (athleteId) WHERE isProudest. Prisma expresses this on Postgres via a raw
  // migration; on SQLite use a partial unique index in the migration SQL:
  //   CREATE UNIQUE INDEX one_proudest_per_athlete
  //     ON "Achievement"("athleteId") WHERE "isProudest" = 1;
  @@index([athleteId])
}
```

## Upload validation (must be re-done server-side)

The demo validates uploads **client-side** in `src/app/lib/athlete-photos.mjs`:

- allowed types: JPG, PNG, WebP (`ALLOWED_PHOTO_TYPES`)
- max size: 4 MB per image (`MAX_PHOTO_BYTES`)
- max count: 8 photos per athlete (`MAX_PHOTOS`)
- safe, generated file names (`safePhotoName` — never trusts client input)

In a client-only demo this is the real boundary, but it is **not** a security
control on its own. A production server MUST re-validate MIME type (by sniffing
content, not just the declared header), size, and count, generate its own safe
names, store files outside the repo (object storage), and authorize that the
caller owns the profile. The reserved upload folder is already in `.gitignore`.
```
