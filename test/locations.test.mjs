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
  assert.deepEqual(provinces, ["Bohol", "Cebu"], "alphabetical, scoped to the region (Siquijor moved to NIR)");
});

test("Siquijor is modeled under the Negros Island Region, not Central Visayas", () => {
  // Siquijor was reassigned from Region VII to NIR.
  assert.ok(!provincesForRegion("Region VII").includes("Siquijor"), "Siquijor is no longer in Region VII");
  assert.ok(provincesForRegion("NIR").includes("Siquijor"), "Siquijor is a province of NIR");
  assert.ok(citiesForProvince("NIR", "Siquijor").includes("Siquijor"), "Siquijor municipality is scoped to NIR");
  assert.ok(!isProvinceInRegion("Region VII", "Siquijor"));
  assert.ok(isProvinceInRegion("NIR", "Siquijor"));
});

test("provincesForRegion is empty for an unknown or blank region", () => {
  assert.deepEqual(provincesForRegion("Region ZZ"), []);
  assert.deepEqual(provincesForRegion(""), []);
  assert.deepEqual(provincesForRegion(null), []);
});

test("citiesForProvince returns cities scoped to the province, sorted", () => {
  const cities = citiesForProvince("Region VII", "Bohol");
  assert.ok(cities.includes("Tagbilaran"), "scoped to the province");
  // Returned alphabetically sorted.
  assert.deepEqual(cities, [...cities].sort((a, b) => a.localeCompare(b)), "sorted");
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
