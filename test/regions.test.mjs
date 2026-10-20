import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  REGIONS,
  REGION_COUNT,
  REGION_CODES,
  resolveRegionCode,
  regionByCode,
  regionName,
} from "../data/regions.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

test("defines exactly 18 canonical regions", () => {
  assert.equal(REGION_COUNT, 18);
  assert.equal(REGIONS.length, 18);
});

test("region codes are unique", () => {
  const codes = REGIONS.map((region) => region.regionCode);
  assert.equal(new Set(codes).size, codes.length);
});

test("every region has a name and at least one alias", () => {
  for (const region of REGIONS) {
    assert.ok(region.regionCode, "regionCode present");
    assert.ok(region.name && region.name.length > 0, "name present");
    assert.ok(
      Array.isArray(region.aliases) && region.aliases.length > 0,
      `aliases present for ${region.regionCode}`,
    );
  }
});

test("includes the 18th region (NIR) in addition to the 17 seed regions", () => {
  assert.ok(REGION_CODES.has("NIR"), "NIR is present");
  for (const code of [
    "NCR",
    "CAR",
    "Region I",
    "Region II",
    "Region III",
    "Region IV-A",
    "Region IV-B",
    "Region V",
    "Region VI",
    "Region VII",
    "Region VIII",
    "Region IX",
    "Region X",
    "Region XI",
    "Region XII",
    "Region XIII",
    "BARMM",
  ]) {
    assert.ok(REGION_CODES.has(code), `${code} is present`);
  }
});

test("all seed regionCode values resolve to a canonical code", async () => {
  // Read the generated seed and confirm every region used there is canonical.
  const raw = await readFile(join(repoRoot, "data", "athletes.json"), "utf8");
  const { athletes } = JSON.parse(raw);
  const seedCodes = new Set(athletes.map((a) => a.regionCode));
  assert.equal(seedCodes.size, 17, "seed covers the 17 original regions");
  for (const code of seedCodes) {
    assert.ok(REGION_CODES.has(code), `seed code ${code} is canonical`);
    assert.equal(resolveRegionCode(code), code, `${code} resolves to itself`);
  }
});

test("representative GeoJSON aliases resolve to the right code", () => {
  assert.equal(resolveRegionCode("Davao Region"), "Region XI");
  assert.equal(resolveRegionCode("Negros Island Region"), "NIR");
  assert.equal(resolveRegionCode("CALABARZON"), "Region IV-A");
  assert.equal(resolveRegionCode("Metropolitan Manila"), "NCR");
  assert.equal(resolveRegionCode("Autonomous Region in Muslim Mindanao"), "BARMM");
  assert.equal(resolveRegionCode("Cordillera"), "CAR");
});

test("alias matching is case- and whitespace-insensitive", () => {
  assert.equal(resolveRegionCode("  davao region  "), "Region XI");
  assert.equal(resolveRegionCode("NEGROS ISLAND REGION"), "NIR");
});

test("unknown or empty names return null", () => {
  assert.equal(resolveRegionCode("Atlantis"), null);
  assert.equal(resolveRegionCode(""), null);
  assert.equal(resolveRegionCode("   "), null);
  assert.equal(resolveRegionCode(null), null);
  assert.equal(resolveRegionCode(undefined), null);
  assert.equal(resolveRegionCode(42), null);
});

test("regionByCode and regionName look up canonical records", () => {
  assert.equal(regionByCode("NIR")?.name, "Negros Island Region");
  assert.equal(regionName("Region XI"), "Davao Region");
  assert.equal(regionByCode("NOPE"), null);
  assert.equal(regionName("NOPE"), null);
});
