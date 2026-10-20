/**
 * App-facing, typed re-export of the canonical Philippine region taxonomy.
 *
 * The underlying data lives in `data/regions.mjs` so that it can be shared,
 * dependency-free, with the build-time prep script and the Node test suite.
 * This module adds TypeScript types for use inside the Next.js app.
 */
import {
  REGIONS as RAW_REGIONS,
  REGION_COUNT as RAW_REGION_COUNT,
  resolveRegionCode as rawResolveRegionCode,
  regionByCode as rawRegionByCode,
  regionName as rawRegionName,
} from "@/data/regions.mjs";

export interface CanonicalRegion {
  /** Canonical short code used across the app/seed (e.g. "NCR", "Region XI"). */
  regionCode: string;
  /** Full administrative region name. */
  name: string;
  /** Lower-cased names/spellings that resolve to this code. */
  aliases: string[];
}

export const REGIONS: CanonicalRegion[] = RAW_REGIONS as CanonicalRegion[];

/** Total number of canonical Philippine administrative regions (18). */
export const REGION_COUNT: number = RAW_REGION_COUNT as number;

/** Resolve a region name/spelling to a canonical code, or `null`. */
export const resolveRegionCode: (name: string | null | undefined) => string | null =
  rawResolveRegionCode;

/** Look up the canonical region record for a code, or `null`. */
export const regionByCode: (regionCode: string) => CanonicalRegion | null =
  rawRegionByCode as (regionCode: string) => CanonicalRegion | null;

/** Full administrative name for a canonical region code, or `null`. */
export const regionName: (regionCode: string) => string | null = rawRegionName;
