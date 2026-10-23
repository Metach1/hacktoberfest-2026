import test from "node:test";
import assert from "node:assert/strict";

import {
  LOCATIONS,
  provincesForRegion,
  citiesForProvince,
  isProvinceInRegion,
  isCityInProvince,
} from "../data/locations.mjs";
import { REGION_CODES } from "../data/regions.mjs";

test("every location region key is a canonical region code", () => {
  for (const code of Object.keys(LOCATIONS)) {
    assert.ok(REGION_CODES.has(code), `${code} is a canonical region code`);
  }
});

test("provincesForRegion returns the region's provinces, sorted", () => {
  const provinces = provincesForRegion("Region VII"); // Central Visayas
  assert.deepEqual(provinces, ["Bohol", "Cebu", "Siquijor"], "alphabetical, scoped to the region");
});

test("provincesForRegion is empty for an unknown or blank region", () => {
  assert.deepEqual(provincesForRegion("Region ZZ"), []);
  assert.deepEqual(provincesForRegion(""), []);
  assert.deepEqual(provincesForRegion(null), []);
});

test("citiesForProvince returns cities scoped to the province, sorted", () => {
  const cities = citiesForProvince("Region VII", "Bohol");
  assert.deepEqual(cities, ["Tagbilaran"]);
  assert.ok(citiesForProvince("Region VII", "Cebu").includes("Cebu City"));
});

test("citiesForProvince rejects a province that isn't in the region", () => {
  // Cebu belongs to Region VII, not Region XI.
  assert.deepEqual(citiesForProvince("Region XI", "Cebu"), []);
  assert.deepEqual(citiesForProvince("Region VII", ""), []);
});

test("parent-consistency helpers enforce the cascade", () => {
  assert.ok(isProvinceInRegion("Region VII", "Cebu"));
  assert.ok(!isProvinceInRegion("Region VII", "Davao del Sur"));
  assert.ok(isCityInProvince("Region VII", "Cebu", "Cebu City"));
  assert.ok(!isCityInProvince("Region VII", "Cebu", "Davao City"));
  assert.ok(!isCityInProvince("Region VII", "Bohol", "Cebu City"), "city must match its province");
});

test("NCR is modeled as a single Metro Manila province with its cities", () => {
  assert.deepEqual(provincesForRegion("NCR"), ["Metro Manila"]);
  assert.ok(citiesForProvince("NCR", "Metro Manila").includes("Quezon City"));
});
