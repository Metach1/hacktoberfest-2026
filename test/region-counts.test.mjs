import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { countByRegion } from "../data/region-counts.mjs";
import { adaptAthletes } from "../data/athlete-adapter.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

test("counts athletes per region code", () => {
  const counts = countByRegion([
    { regionCode: "NCR" },
    { regionCode: "NCR" },
    { regionCode: "Region XI" },
  ]);
  assert.equal(counts.NCR, 2);
  assert.equal(counts["Region XI"], 1);
});

test("regions with no athletes are absent (treated as zero)", () => {
  const counts = countByRegion([{ regionCode: "NCR" }]);
  assert.equal(counts.NIR, undefined);
  assert.equal(counts.NIR ?? 0, 0);
});

test("ignores entries without a usable region code", () => {
  const counts = countByRegion([
    { regionCode: "NCR" },
    { regionCode: "" },
    {},
    null,
    { regionCode: 5 },
  ]);
  assert.equal(counts.NCR, 1);
  assert.equal(Object.keys(counts).length, 1);
});

test("handles non-array input defensively", () => {
  assert.deepEqual(countByRegion(undefined), {});
  assert.deepEqual(countByRegion(null), {});
});

test("totals across the real seed equal the athlete count and cover 17 regions", async () => {
  const raw = await readFile(join(repoRoot, "data", "athletes.json"), "utf8");
  const seed = JSON.parse(raw).athletes;
  const athletes = adaptAthletes(seed);
  const counts = countByRegion(athletes);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  assert.equal(total, athletes.length);
  assert.equal(total, 30);
  // Seed populates 17 of 18 regions; NIR has no athletes.
  assert.equal(Object.keys(counts).length, 17);
  assert.equal(counts.NIR ?? 0, 0);
});
