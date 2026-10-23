/**
 * Canonical list of sports offered in the athlete registration and
 * edit-profile forms. Single source of truth so both forms stay in sync; the
 * Discover filter derives its options from athlete data instead, so it is not
 * driven by this list.
 *
 * Curated toward sports commonly played/competed in the Philippines. Extend as
 * needed — the forms map over this array, so adding an entry here updates both.
 */
export const SPORTS = [
  "Track & Field",
  "Arnis",
  "Badminton",
  "Baseball",
  "Basketball",
  "Boxing",
  "Chess",
  "Cycling",
  "Football",
  "Karate",
  "Lawn Tennis",
  "Softball",
  "Swimming",
  "Table Tennis",
  "Taekwondo",
  "Volleyball",
  "Weightlifting",
  "Wrestling",
] as const;

export type Sport = (typeof SPORTS)[number];

/** The default sport selection used when a form first renders. */
export const DEFAULT_SPORT: Sport = "Track & Field";
