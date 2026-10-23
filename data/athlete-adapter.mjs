/**
 * Pure, dependency-free transform from the fictional seed record shape
 * (`data/athletes.json`) to the UI `Athlete` view shape used by Startlete
 * screens. Kept as a plain ES module so it can be unit-tested by native Node
 * and imported by the typed adapter in `src/app/data/athletes.ts`.
 *
 * All data is fictional. No real athlete identities, PII, verification proofs,
 * or payment information may be introduced (see `data/README.md`).
 */
import { resolveRegionCode } from "./regions.mjs";

/** Local fallback image; the demo never depends on a remote asset to render. */
export const PLACEHOLDER_IMAGE = "/athlete-placeholder.svg";

/** Generic, non-identifying stock imagery keyed by sport, with a safe fallback. */
export const SPORT_IMAGE = {
  "Track and Field":
    "https://images.unsplash.com/photo-1728532483490-708f6562b738?auto=format&fit=crop&w=900&q=85",
  Boxing:
    "https://images.unsplash.com/photo-1681203888755-bd61fe3558eb?auto=format&fit=crop&w=900&q=85",
  Basketball:
    "https://images.unsplash.com/photo-1580442256395-d9c32a65fbf6?auto=format&fit=crop&w=900&q=85",
  Swimming:
    "https://images.unsplash.com/photo-1772203031513-4a20f7478ad9?auto=format&fit=crop&w=900&q=85",
};

/** @param {string} sport */
export function imageForSport(sport) {
  return SPORT_IMAGE[sport] ?? PLACEHOLDER_IMAGE;
}

/**
 * Per-athlete photo overrides, keyed by stable seed id.
 *
 * The landing page highlights individual athletes, so a specific athlete can
 * carry an authentic-looking photo in a relatable local setting instead of the
 * generic sport image. Only the listed ids are overridden; every other athlete
 * keeps its sport image.
 *
 * Mapping note: the photo refresh called out a Track & Field "Mikaela" and a
 * Boxing "Paolo". Starlete's fictional seed has a Track & Field athlete named
 * Mikaela Solis (ath-001), which matches on both name and sport, so she gets a
 * runner-on-a-track photo. The seed has no boxer named Paolo — "Paolo" (ath-006)
 * is a weightlifter, and the two boxers are women — so no second override is
 * applied, to avoid pairing an athlete with a photo of the wrong sport.
 * The URL was verified to return a 200 image response.
 */
export const ATHLETE_IMAGE_OVERRIDE = {
  // A runner mid-stride on an outdoor track — a relatable local training scene.
  "ath-001":
    "https://images.unsplash.com/photo-1786333889785-f8311fc3f487?auto=format&fit=crop&w=900&q=85",
};

/** Resolve an athlete's photo: a per-id override if present, else the sport image. */
export function imageForAthlete(record) {
  return ATHLETE_IMAGE_OVERRIDE[record.id] ?? imageForSport(record.sport);
}

/**
 * Seed photo gallery for an athlete. The three fictional seed athletes keep a
 * single sport/override photo so their cards, the map, Browse, and profiles all
 * render exactly as before — the array form is just the new shape. Alt text is
 * generated so screen readers get "Photo of <name>".
 */
export function seedPhotos(record) {
  return [
    {
      id: `seed-photo-${record.id}`,
      name: `seed-${record.id}.jpg`,
      src: imageForAthlete(record),
      alt: `Photo of ${record.name}`,
    },
  ];
}

/**
 * Seed achievements for an athlete from the plural `achievements` array the
 * seed already carries. The FIRST seed achievement is marked proudest so the
 * existing "Proudest achievement" copy on the profile keeps showing the same
 * text. Event/date/description are left blank (the seed has only titles).
 */
export function seedAchievements(record) {
  const titles = Array.isArray(record.achievements) ? record.achievements : [];
  return titles.map((title, i) => ({
    id: `seed-ach-${record.id}-${i}`,
    title: String(title ?? ""),
    event: "",
    date: "",
    description: "",
    isProudest: i === 0,
  }));
}

/**
 * Convert a stable seed id (e.g. "ath-007") into the numeric id the UI uses.
 * @param {string} seedId
 * @returns {number}
 */
export function numericId(seedId) {
  const match = /(\d+)\s*$/.exec(String(seedId));
  return match ? Number.parseInt(match[1], 10) : 0;
}

/**
 * Map a single seed record to the UI `Athlete` view shape.
 * @param {Record<string, any>} record
 */
export function toAthlete(record) {
  const regionCode = resolveRegionCode(record.regionCode) ?? record.regionCode;
  const photos = seedPhotos(record);
  const achievements = seedAchievements(record);
  const proudest = achievements.find((a) => a.isProudest) ?? achievements[0];
  return {
    id: numericId(record.id),
    name: record.name,
    sport: record.sport,
    location: record.provinceOrLocality,
    regionCode,
    region: record.region,
    // Full gallery. The first photo is the profile picture.
    photos,
    // Backward-compatible single image = profile picture (first photo src).
    image: photos[0]?.src ?? PLACEHOLDER_IMAGE,
    raised: record.fundingRaised,
    goal: record.fundingGoal,
    supporters: record.votes,
    verified: record.verified,
    bio: record.bio,
    // School / university / club / team. The fictional seed has none, so it
    // defaults to "" — existing athletes are prompted to fill it on next edit.
    institution: typeof record.institution === "string" ? record.institution : "",
    // Full achievement list plus a backward-compatible proudest-title string.
    achievements,
    achievement: proudest?.title ?? "",
    featured: record.ranking >= 1 && record.ranking <= 3,
  };
}

/**
 * Adapt a list of seed records to the UI view shape.
 * @param {Array<Record<string, any>>} records
 */
export function adaptAthletes(records) {
  return records.map(toAthlete);
}
