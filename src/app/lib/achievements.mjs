/**
 * Pure, DOM-free logic for an athlete's achievements: validation, add/edit/
 * delete, and the "exactly one proudest" rule. A plain ES module so it is
 * unit-tested with `node --test`, matching the other logic modules here.
 *
 * Each achievement: { id, title, event, date, description, isProudest }.
 *  - title       required, <= TITLE_MAX chars
 *  - event       optional (competition / meet), <= EVENT_MAX chars
 *  - date        optional "YYYY" or "YYYY-MM-DD"; must not be in the future
 *  - description optional, <= DESCRIPTION_MAX chars
 *  - isProudest  at most ONE true across the list (enforced by markProudest)
 *
 * Achievements are self-reported. Per-achievement verification does NOT exist
 * in this app (only an athlete-level `verified` flag), so no verified/unverified
 * label is produced here — matching the brief's "don't build new verification".
 */

export const TITLE_MAX = 80;
export const EVENT_MAX = 80;
export const DESCRIPTION_MAX = 280;

/** Stable unique id for an achievement record. */
export function newAchievementId(athleteId) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `ach-${athleteId}-${Date.now()}-${rand}`;
}

/**
 * Parse a date input into an epoch ms for comparison, accepting "YYYY" and
 * full ISO dates. Returns null when blank/invalid (callers treat blank as OK,
 * invalid as an error). Year-only is treated as that year's Jan 1.
 */
function dateMs(value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  if (/^\d{4}$/.test(v)) return Date.parse(`${v}-01-01T00:00:00Z`);
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? NaN : ms;
}

/**
 * Validate achievement fields. Returns `{ ok: true, fields }` with trimmed
 * values, or `{ ok: false, errors }` mapping field -> message. `now` is
 * injectable for deterministic "future date" tests.
 *
 * @param {{ title?: string, event?: string, date?: string, description?: string }} input
 * @param {number} now epoch ms "today"
 */
export function validateAchievement(input, now = Date.now()) {
  const title = String(input?.title ?? "").trim();
  const event = String(input?.event ?? "").trim();
  const date = String(input?.date ?? "").trim();
  const description = String(input?.description ?? "").trim();
  const errors = {};

  if (!title) {
    errors.title = "Title is required.";
  } else if (title.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
  }
  if (event.length > EVENT_MAX) {
    errors.event = `Event must be ${EVENT_MAX} characters or fewer.`;
  }
  if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }
  if (date) {
    const ms = dateMs(date);
    if (Number.isNaN(ms)) {
      errors.date = "Enter a valid date or year.";
    } else if (ms > now) {
      errors.date = "The date cannot be in the future.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, fields: { title, event, date, description } };
}

/**
 * Build a validated achievement record (not yet proudest). Returns
 * `{ ok, achievement }` or `{ ok: false, errors }`.
 */
export function buildAchievement(athleteId, input, now = Date.now()) {
  const result = validateAchievement(input, now);
  if (!result.ok) return result;
  return {
    ok: true,
    achievement: {
      id: newAchievementId(athleteId),
      ...result.fields,
      isProudest: false,
    },
  };
}

/** Append an achievement, returning a NEW array. */
export function addAchievement(list, achievement) {
  const arr = Array.isArray(list) ? list : [];
  if (!achievement) return arr.slice();
  return [...arr, achievement];
}

/** Apply a validated patch to one achievement, returning a NEW array. */
export function editAchievement(list, id, fields) {
  return (Array.isArray(list) ? list : []).map((a) =>
    a.id === id ? { ...a, ...fields } : a,
  );
}

/**
 * Delete an achievement. If the deleted one was the proudest and others remain,
 * no new proudest is auto-assigned (the athlete chooses) — but the invariant
 * "at most one proudest" is preserved. Returns a NEW array.
 */
export function deleteAchievement(list, id) {
  return (Array.isArray(list) ? list : []).filter((a) => a.id !== id);
}

/**
 * Mark exactly one achievement as proudest: the target becomes proudest and
 * every other is cleared, so there is never more than one. A no-op (returns the
 * list unchanged in shape) if the id isn't present. Returns a NEW array.
 */
export function markProudest(list, id) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((a) => ({ ...a, isProudest: a.id === id }));
}

/** The single proudest achievement, or the newest, or null. */
export function proudestAchievement(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.find((a) => a.isProudest) ?? sortNewestFirst(arr)[0] ?? null;
}

/**
 * Sort newest-first by date (year-only counts as Jan 1 of that year), with
 * undated achievements last and ties stable. Returns a NEW array.
 */
export function sortNewestFirst(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  return arr
    .map((a, i) => ({ a, i, ms: dateMs(a.date) }))
    .sort((x, y) => {
      const xm = x.ms == null || Number.isNaN(x.ms) ? -Infinity : x.ms;
      const ym = y.ms == null || Number.isNaN(y.ms) ? -Infinity : y.ms;
      if (xm !== ym) return ym - xm;
      return x.i - y.i;
    })
    .map((e) => e.a);
}

/**
 * Count how many achievements are flagged proudest — used by tests/guards to
 * assert the invariant holds (should always be 0 or 1).
 */
export function proudestCount(list) {
  return (Array.isArray(list) ? list : []).filter((a) => a.isProudest).length;
}
