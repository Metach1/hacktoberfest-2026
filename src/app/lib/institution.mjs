/**
 * Pure, DOM-free logic for an athlete's "Institution" ΓÇö the school, university,
 * club, or team they represent (e.g. "University of the Philippines Cebu").
 * Kept as a plain ES module so the validation and autocomplete rules are
 * unit-tested with `node --test` and reused identically on the client form and
 * any server-side check ΓÇö matching the other logic modules in this repo.
 *
 * Privacy note: the institution NAME is public (shown on the card and profile).
 * Never collect or expose addresses, student IDs, or contact details ΓÇö many
 * athletes may be minors.
 */

/** Max characters for an institution name. Long enough for full official names. */
export const INSTITUTION_MAX = 120;

/**
 * Normalize a raw institution value: trim ends and collapse internal runs of
 * whitespace to single spaces, so "UP   Cebu " and "UP Cebu" are stored the
 * same way and autocomplete stays consistent.
 */
export function normalizeInstitution(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Validate an institution value. Required and non-empty after trimming
 * (whitespace-only is rejected), and no longer than INSTITUTION_MAX.
 * Returns `{ ok: true, value }` with the normalized value, or
 * `{ ok: false, error }` with a clear, user-facing message.
 */
export function validateInstitution(value) {
  const normalized = normalizeInstitution(value);
  if (normalized === "") {
    return { ok: false, error: "Enter your school, university, club, or team." };
  }
  if (normalized.length > INSTITUTION_MAX) {
    return { ok: false, error: `Institution must be ${INSTITUTION_MAX} characters or fewer.` };
  }
  return { ok: true, value: normalized };
}

/**
 * Distinct institution names already entered by athletes, for autocomplete.
 * Case-insensitively de-duplicated (keeping the first-seen spelling), empty
 * values dropped, and sorted alphabetically so the suggestion list is stable.
 *
 * @param {Array<{ institution?: string }>} athletes
 * @returns {string[]}
 */
export function institutionSuggestions(athletes) {
  const seen = new Map();
  for (const athlete of Array.isArray(athletes) ? athletes : []) {
    const name = normalizeInstitution(athlete?.institution);
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
