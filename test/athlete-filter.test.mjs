import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { filterAthletes } from "../data/athlete-filter.mjs";
import { adaptAthletes } from "../data/athlete-adapter.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const sample = [
  { name: "Ana Cruz", sport: "Boxing", location: "Baguio City", regionCode: "CAR" },
  { name: "Ben Dizon", sport: "Boxing", location: "Naga City", regionCode: "Region V" },
  { name: "Cy Reyes", sport: "Swimming", location: "Davao City", regionCode: "Region XI" },
];

test("returns all athletes when no filters are set", () => {
  assert.equal(filterAthletes(sample).length, 3);
});

test("filters by region code only", () => {
  const out = filterAthletes(sample, { region: "CAR" });
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "Ana Cruz");
});

test("filters by sport only, respecting the all-sports sentinel", () => {
  assert.equal(filterAthletes(sample, { sport: "Boxing" }).length, 2);
  assert.equal(filterAthletes(sample, { sport: "All sports" }).length, 3);
});

test("search matches across name, sport and location", () => {
  assert.equal(filterAthletes(sample, { search: "davao" }).length, 1);
  assert.equal(filterAthletes(sample, { search: "boxing" }).length, 2);
  assert.equal(filterAthletes(sample, { search: "cruz" }).length, 1);
});

test("region intersects with sport and search (AND semantics)", () => {
  // Region V has one boxer (Ben); combining with sport Boxing keeps him.
  const out = filterAthletes(sample, { region: "Region V", sport: "Boxing" });
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "Ben Dizon");
  // Region V + a swimming filter yields nobody.
  assert.equal(filterAthletes(sample, { region: "Region V", sport: "Swimming" }).length, 0);
});

test("empty region (e.g. NIR) yields no athletes from the real seed", async () => {
  const seed = JSON.parse(await readFile(join(repoRoot, "data", "athletes.json"), "utf8")).athletes;
  const athletes = adaptAthletes(seed);
  assert.equal(filterAthletes(athletes, { region: "NIR" }).length, 0);
});

test("selecting a populated region scopes the real seed correctly", async () => {
  const seed = JSON.parse(await readFile(join(repoRoot, "data", "athletes.json"), "utf8")).athletes;
  const athletes = adaptAthletes(seed);
  const ncr = filterAthletes(athletes, { region: "NCR" });
  assert.ok(ncr.length > 0);
  assert.ok(ncr.every((a) => a.regionCode === "NCR"));
});
