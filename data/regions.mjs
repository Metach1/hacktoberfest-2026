/**
 * Canonical taxonomy of the 18 administrative regions of the Philippines.
 *
 * This is the single source of truth shared by:
 *   - the build-time region map prep script (`data/build-regions.mjs`), and
 *   - the app, via the thin re-export in `src/app/lib/regions.ts`.
 *
 * It is a plain, dependency-free ES module so it can be imported both by
 * native Node (the prep script and the test suite) and by the Next.js/TypeScript
 * app bundle.
 *
 * `regionCode` values match the codes used by the fictional seed data in
 * `data/seed.mjs` / `data/athletes.json` (NCR, CAR, Region I–XIII, BARMM),
 * plus NIR (Negros Island Region), the 18th region reconstituted in 2024 that
 * the seed does not yet populate.
 *
 * `aliases` maps the region names that appear in public-domain GeoJSON sources
 * (and other common spellings) to the canonical code, so the prep script can
 * resolve boundary features to a code deterministically.
 */

/**
 * @typedef {Object} CanonicalRegion
 * @property {string} regionCode  Canonical short code used across the app/seed.
 * @property {string} name        Full administrative region name.
 * @property {string[]} aliases   Lower-cased names/spellings that resolve to this code.
 */

/** @type {CanonicalRegion[]} */
export const REGIONS = [
  {
    regionCode: "NCR",
    name: "National Capital Region",
    aliases: [
      "national capital region",
      "metropolitan manila",
      "metro manila",
      "ncr",
    ],
  },
  {
    regionCode: "CAR",
    name: "Cordillera Administrative Region",
    aliases: ["cordillera administrative region", "cordillera", "car"],
  },
  {
    regionCode: "Region I",
    name: "Ilocos Region",
    aliases: ["ilocos region", "ilocos", "region i", "region 1"],
  },
  {
    regionCode: "Region II",
    name: "Cagayan Valley",
    aliases: ["cagayan valley", "region ii", "region 2"],
  },
  {
    regionCode: "Region III",
    name: "Central Luzon",
    aliases: ["central luzon", "region iii", "region 3"],
  },
  {
    regionCode: "Region IV-A",
    name: "CALABARZON",
    aliases: ["calabarzon", "region iv-a", "region iva", "region 4a"],
  },
  {
    regionCode: "Region IV-B",
    name: "MIMAROPA",
    aliases: [
      "mimaropa",
      "southwestern tagalog region",
      "region iv-b",
      "region ivb",
      "region 4b",
    ],
  },
  {
    regionCode: "Region V",
    name: "Bicol Region",
    aliases: ["bicol region", "bicol", "region v", "region 5"],
  },
  {
    regionCode: "Region VI",
    name: "Western Visayas",
    aliases: ["western visayas", "region vi", "region 6"],
  },
  {
    regionCode: "Region VII",
    name: "Central Visayas",
    aliases: ["central visayas", "region vii", "region 7"],
  },
  {
    regionCode: "Region VIII",
    name: "Eastern Visayas",
    aliases: ["eastern visayas", "region viii", "region 8"],
  },
  {
    regionCode: "Region IX",
    name: "Zamboanga Peninsula",
    aliases: ["zamboanga peninsula", "region ix", "region 9"],
  },
  {
    regionCode: "Region X",
    name: "Northern Mindanao",
    aliases: ["northern mindanao", "region x", "region 10"],
  },
  {
    regionCode: "Region XI",
    name: "Davao Region",
    aliases: ["davao region", "davao", "region xi", "region 11"],
  },
  {
    regionCode: "Region XII",
    name: "SOCCSKSARGEN",
    aliases: ["soccsksargen", "region xii", "region 12"],
  },
  {
    regionCode: "Region XIII",
    name: "Caraga",
    aliases: ["caraga", "region xiii", "region 13"],
  },
  {
    regionCode: "BARMM",
    name: "Bangsamoro Autonomous Region in Muslim Mindanao",
    aliases: [
      "bangsamoro autonomous region in muslim mindanao",
      "bangsamoro",
      "autonomous region in muslim mindanao",
      "armm",
      "barmm",
    ],
  },
  {
    regionCode: "NIR",
    name: "Negros Island Region",
    aliases: ["negros island region", "negros island", "negros", "nir"],
  },
];

/** Total number of canonical Philippine administrative regions. */
export const REGION_COUNT = REGIONS.length;

/** Set of valid canonical region codes, for quick membership checks. */
export const REGION_CODES = new Set(REGIONS.map((region) => region.regionCode));

const CODE_BY_ALIAS = (() => {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const region of REGIONS) {
    // The canonical name and code themselves resolve, in addition to aliases.
    map.set(region.name.toLowerCase(), region.regionCode);
    map.set(region.regionCode.toLowerCase(), region.regionCode);
    for (const alias of region.aliases) {
      map.set(alias.toLowerCase(), region.regionCode);
    }
  }
  return map;
})();

const REGION_BY_CODE = new Map(
  REGIONS.map((region) => [region.regionCode, region]),
);

/**
 * Resolve an arbitrary region name/spelling to a canonical region code.
 *
 * @param {string | null | undefined} name A region name from a GeoJSON feature or seed record.
 * @returns {string | null} The canonical region code, or `null` if it does not resolve.
 */
export function resolveRegionCode(name) {
  if (typeof name !== "string") return null;
  const key = name.trim().toLowerCase();
  if (key === "") return null;
  return CODE_BY_ALIAS.get(key) ?? null;
}

/**
 * Look up the canonical region record for a code.
 *
 * @param {string} regionCode
 * @returns {CanonicalRegion | null}
 */
export function regionByCode(regionCode) {
  return REGION_BY_CODE.get(regionCode) ?? null;
}

/**
 * Full administrative name for a canonical region code.
 *
 * @param {string} regionCode
 * @returns {string | null}
 */
export function regionName(regionCode) {
  return REGION_BY_CODE.get(regionCode)?.name ?? null;
}
