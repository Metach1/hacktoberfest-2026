/**
 * Pure model of the edit-profile draft lifecycle, extracted so the
 * "nothing is saved until the athlete confirms" rule is unit-testable with
 * `node --test` (the edit screen is a thin shell over these rules).
 *
 * A draft is an in-memory copy of the stored athlete. Edits mutate the draft
 * only. `commitDraft` is the single gate that turns a draft into a store write:
 * it returns the patch to persist ONLY when `confirmed` is true and the draft
 * is valid; otherwise it returns null and the store is left untouched.
 */

import { validateInstitution } from "./institution.mjs";

/** Validate the draft's own text fields (name required, goal > 0, institution). */
export function draftErrors(draft) {
  const errors = {};
  if (!draft || String(draft.name ?? "").trim() === "") errors.name = "Name is required.";
  const goal = Number(draft?.goal);
  if (!Number.isFinite(goal) || goal <= 0) errors.goal = "Funding goal must be greater than zero.";
  const institution = validateInstitution(draft?.institution);
  if (!institution.ok) errors.institution = institution.error;
  return errors;
}

export function isDraftValid(draft) {
  return Object.keys(draftErrors(draft)).length === 0;
}

/**
 * The commit gate. Returns the profile patch to persist, or null.
 *
 * @param {object} draft the edited draft athlete
 * @param {boolean} confirmed did the athlete click "Save changes"?
 * @returns {null | { name, location, bio, sport, goal, photos, achievements }}
 */
export function commitDraft(draft, confirmed) {
  if (!confirmed) return null; // preview / back-to-editing never persists
  if (!isDraftValid(draft)) return null; // invalid never persists
  return {
    name: String(draft.name).trim(),
    location: String(draft.location ?? "").trim(),
    bio: String(draft.bio ?? ""),
    sport: String(draft.sport ?? ""),
    goal: Number(draft.goal),
    // Store the normalized institution (trimmed, collapsed whitespace).
    institution: validateInstitution(draft.institution).value ?? "",
    photos: Array.isArray(draft.photos) ? draft.photos : [],
    achievements: Array.isArray(draft.achievements) ? draft.achievements : [],
  };
}

/** True when the draft differs from the stored athlete (drives unsaved warning). */
export function isDirty(stored, draft) {
  return JSON.stringify(stored) !== JSON.stringify(draft);
}
