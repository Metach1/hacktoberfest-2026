/**
 * App-facing, typed access to the generated region map data and the pure
 * region/filter helpers. The underlying implementations live in `data/*.mjs`
 * so they can be shared with the dependency-free Node test suite.
 */
import phRegions from "@/data/ph-regions.json";
import { countByRegion as rawCountByRegion } from "@/data/region-counts.mjs";
import { filterAthletes as rawFilterAthletes } from "@/data/athlete-filter.mjs";

export interface RegionPath {
  regionCode: string;
  name: string;
  svgPath: string;
}

export interface RegionMap {
  description: string;
  viewBox: string;
  regions: RegionPath[];
}

export const REGION_MAP: RegionMap = phRegions as RegionMap;

/** Minimal athlete shape required by region counts and filtering. */
export interface RegionAthlete {
  id: string | number;
  name: string;
  sport: string;
  location: string;
  regionCode: string;
}

/** Tally athletes per canonical region code. */
export const countByRegion: (athletes: Pick<RegionAthlete, "regionCode">[]) => Record<string, number> =
  rawCountByRegion as (athletes: Pick<RegionAthlete, "regionCode">[]) => Record<string, number>;

export interface AthleteFilters {
  search?: string;
  sport?: string;
  region?: string | null;
  allSportsLabel?: string;
}

/** Apply Discover's combined search/sport/region filters to the athlete list. */
export const filterAthletes: <T extends RegionAthlete>(athletes: T[], filters?: AthleteFilters) => T[] =
  rawFilterAthletes as <T extends RegionAthlete>(athletes: T[], filters?: AthleteFilters) => T[];
