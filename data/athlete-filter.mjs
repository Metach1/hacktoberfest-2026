/**
 * Pure helper: apply the Discover screen's combined filters to a list of
 * athletes. Shared, dependency-free, so it can be unit-tested by native Node
 * and reused by the app's Discover view.
 *
 * Filters are ANDed together:
 *   - `search`  matches (case-insensitively) across name, sport and location.
 *   - `sport`   matches an exact sport, unless it is the "all" sentinel.
 *   - `region`  matches an exact canonical regionCode, when set (null = any).
 *
 * @param {Array<Record<string, any>>} athletes
 * @param {{ search?: string, sport?: string, region?: string | null,
 *           allSportsLabel?: string }} [filters]
 * @returns {Array<Record<string, any>>}
 */
export function filterAthletes(athletes, filters = {}) {
  if (!Array.isArray(athletes)) return [];
  const search = (filters.search ?? "").trim().toLowerCase();
  const sport = filters.sport ?? "";
  const allSports = filters.allSportsLabel ?? "All sports";
  const region = filters.region ?? null;

  return athletes.filter((athlete) => {
    const matchesSearch =
      search === "" ||
      `${athlete.name ?? ""}${athlete.sport ?? ""}${athlete.location ?? ""}`
        .toLowerCase()
        .includes(search);
    const matchesSport = sport === allSports || sport === "" || athlete.sport === sport;
    const matchesRegion = region == null || athlete.regionCode === region;
    return matchesSearch && matchesSport && matchesRegion;
  });
}
