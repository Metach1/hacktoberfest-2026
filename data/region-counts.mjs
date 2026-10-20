/**
 * Pure helper: tally how many athletes fall in each region, keyed by canonical
 * region code. Kept as a dependency-free ES module so it can be unit-tested by
 * native Node and imported by the app's map component.
 *
 * @param {Array<{ regionCode?: string }>} athletes
 * @returns {Record<string, number>} A map of regionCode -> athlete count.
 */
export function countByRegion(athletes) {
  /** @type {Record<string, number>} */
  const counts = {};
  if (!Array.isArray(athletes)) return counts;
  for (const athlete of athletes) {
    const code = athlete?.regionCode;
    if (typeof code !== "string" || code === "") continue;
    counts[code] = (counts[code] ?? 0) + 1;
  }
  return counts;
}
