
/**
 * App-facing, typed re-export of the canonical region → province → city
 * taxonomy. The underlying data and pure helpers live in `data/locations.mjs`
 * so they can be shared, dependency-free, with the Node test suite. This module
 * adds TypeScript types for use inside the Next.js app.
 */
import {
  LOCATIONS as RAW_LOCATIONS,
  provincesForRegion as rawProvincesForRegion,
  citiesForProvince as rawCitiesForProvince,
  isProvinceInRegion as rawIsProvinceInRegion,
  isCityInProvince as rawIsCityInProvince,
} from "@/data/locations.mjs";

/** regionCode -> { provinceName -> cityName[] } */
export type LocationTree = Record<string, Record<string, string[]>>;

export const LOCATIONS: LocationTree = RAW_LOCATIONS as LocationTree;

/** Provinces within a region, sorted alphabetically (empty for unknown code). */
export const provincesForRegion: (regionCode: string) => string[] = rawProvincesForRegion;

/** Cities within a province of a region, sorted alphabetically. */
export const citiesForProvince: (regionCode: string, province: string) => string[] =
  rawCitiesForProvince;

/** Whether a province belongs to a region. */
export const isProvinceInRegion: (regionCode: string, province: string) => boolean =
  rawIsProvinceInRegion;

/** Whether a city belongs to a province within a region. */
export const isCityInProvince: (
  regionCode: string,
  province: string,
  city: string,
) => boolean = rawIsCityInProvince;
