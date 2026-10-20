import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { REGION_CODES, REGION_COUNT } from "../data/regions.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

async function loadRegionPaths() {
  const raw = await readFile(join(repoRoot, "data", "ph-regions.json"), "utf8");
  return JSON.parse(raw);
}

test("generated region map has the expected viewBox", async () => {
  const data = await loadRegionPaths();
  assert.equal(data.viewBox, "0 0 300 470");
});

test("generated region map has exactly 18 regions", async () => {
  const data = await loadRegionPaths();
  assert.equal(data.regions.length, REGION_COUNT);
  assert.equal(data.regions.length, 18);
});

test("each region has a unique canonical code (including NIR)", async () => {
  const data = await loadRegionPaths();
  const codes = data.regions.map((r) => r.regionCode);
  assert.equal(new Set(codes).size, codes.length, "codes are unique");
  for (const code of codes) {
    assert.ok(REGION_CODES.has(code), `${code} is canonical`);
  }
  assert.ok(codes.includes("NIR"), "NIR is present");
});

test("each region has a name and a non-empty SVG path starting with M", async () => {
  const data = await loadRegionPaths();
  for (const region of data.regions) {
    assert.ok(region.name && region.name.length > 0, `${region.regionCode} has a name`);
    assert.equal(typeof region.svgPath, "string");
    assert.ok(region.svgPath.length > 0, `${region.regionCode} path non-empty`);
    assert.ok(region.svgPath.startsWith("M"), `${region.regionCode} path starts with M`);
    assert.ok(region.svgPath.endsWith("Z"), `${region.regionCode} path is closed`);
  }
});

test("all projected coordinates fall inside the viewBox", async () => {
  const data = await loadRegionPaths();
  // Extract every numeric coordinate token from the path commands.
  for (const region of data.regions) {
    const numbers = region.svgPath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    for (let i = 0; i < numbers.length; i += 2) {
      const x = numbers[i];
      const y = numbers[i + 1];
      assert.ok(x >= 0 && x <= 300, `${region.regionCode} x within viewBox`);
      assert.ok(y >= 0 && y <= 470, `${region.regionCode} y within viewBox`);
    }
  }
});
