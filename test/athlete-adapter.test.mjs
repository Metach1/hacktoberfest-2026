import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  adaptAthletes,
  toAthlete,
  numericId,
  imageForSport,
  PLACEHOLDER_IMAGE,
} from "../data/athlete-adapter.mjs";
import { REGION_CODES } from "../data/regions.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

async function loadSeed() {
  const raw = await readFile(join(repoRoot, "data", "athletes.json"), "utf8");
  return JSON.parse(raw).athletes;
}

test("adapts all 30 seed athletes to the view shape", async () => {
  const seed = await loadSeed();
  const athletes = adaptAthletes(seed);
  assert.equal(athletes.length, 30);
});

test("every adapted athlete has a canonical regionCode", async () => {
  const athletes = adaptAthletes(await loadSeed());
  for (const athlete of athletes) {
    assert.ok(
      REGION_CODES.has(athlete.regionCode),
      `${athlete.name} has canonical region ${athlete.regionCode}`,
    );
  }
});

test("every adapted athlete has required non-empty string fields", async () => {
  const athletes = adaptAthletes(await loadSeed());
  for (const a of athletes) {
    assert.equal(typeof a.name, "string");
    assert.ok(a.name.length > 0);
    assert.ok(a.sport.length > 0);
    assert.ok(a.location.length > 0);
    assert.ok(a.region.length > 0);
    assert.ok(a.image.length > 0);
  }
});

test("funding and supporter fields are valid numbers", async () => {
  const athletes = adaptAthletes(await loadSeed());
  for (const a of athletes) {
    assert.ok(Number.isFinite(a.raised) && a.raised >= 0);
    assert.ok(Number.isFinite(a.goal) && a.goal > 0);
    assert.ok(a.raised <= a.goal, `${a.name}: raised within goal`);
    assert.ok(Number.isInteger(a.supporters) && a.supporters >= 0);
  }
});

test("ids are unique positive integers derived from the seed id", async () => {
  const athletes = adaptAthletes(await loadSeed());
  const ids = athletes.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  for (const id of ids) {
    assert.ok(Number.isInteger(id) && id > 0);
  }
});

test("featured flag selects exactly the top three by ranking", async () => {
  const athletes = adaptAthletes(await loadSeed());
  const featured = athletes.filter((a) => a.featured);
  assert.equal(featured.length, 3);
});

test("numericId parses the trailing number of a seed id", () => {
  assert.equal(numericId("ath-001"), 1);
  assert.equal(numericId("ath-030"), 30);
  assert.equal(numericId("no-number"), 0);
});

test("imageForSport falls back to the local placeholder for unknown sports", () => {
  assert.equal(imageForSport("Quidditch"), PLACEHOLDER_IMAGE);
  assert.ok(imageForSport("Basketball").length > 0);
});

test("toAthlete maps seed fields onto the view fields", () => {
  const record = {
    id: "ath-099",
    name: "Test Fictional",
    sport: "Basketball",
    regionCode: "Davao Region",
    region: "Davao Region",
    provinceOrLocality: "Davao City",
    bio: "Fictional bio.",
    achievements: ["Fictional achievement"],
    verified: true,
    fundingGoal: 100000,
    fundingRaised: 40000,
    votes: 55,
    ranking: 2,
  };
  const a = toAthlete(record);
  assert.equal(a.id, 99);
  assert.equal(a.location, "Davao City");
  assert.equal(a.regionCode, "Region XI"); // resolved from alias
  assert.equal(a.raised, 40000);
  assert.equal(a.goal, 100000);
  assert.equal(a.supporters, 55);
  assert.equal(a.achievement, "Fictional achievement");
  assert.equal(a.featured, true);
});

test("toAthlete produces a one-photo gallery whose first photo is the profile image", () => {
  const a = toAthlete({
    id: "ath-050", name: "Gallery Seed", sport: "Boxing",
    regionCode: "NCR", region: "National Capital Region", provinceOrLocality: "Taguig",
    bio: "Fictional.", achievements: ["First", "Second"], verified: false,
    fundingGoal: 50000, fundingRaised: 10000, votes: 3, ranking: 20,
  });
  assert.ok(Array.isArray(a.photos));
  assert.equal(a.photos.length, 1);
  assert.equal(a.photos[0].src, a.image); // profile picture == first photo
  assert.match(a.photos[0].alt, /Photo of Gallery Seed/);
});

test("toAthlete expands the seed achievements array with exactly one proudest", () => {
  const a = toAthlete({
    id: "ath-051", name: "Ach Seed", sport: "Swimming",
    regionCode: "NCR", region: "National Capital Region", provinceOrLocality: "Pasig",
    bio: "Fictional.", achievements: ["Alpha", "Beta", "Gamma"], verified: false,
    fundingGoal: 60000, fundingRaised: 20000, votes: 8, ranking: 15,
  });
  assert.equal(a.achievements.length, 3);
  const proudest = a.achievements.filter((x) => x.isProudest);
  assert.equal(proudest.length, 1, "exactly one proudest");
  assert.equal(proudest[0].title, "Alpha", "first seed achievement is proudest");
  assert.equal(a.achievement, "Alpha", "backward-compatible string tracks proudest");
});

test("the three real seed athletes keep a single rendering photo (no break)", async () => {
  const athletes = adaptAthletes(await loadSeed());
  for (const a of athletes) {
    assert.ok(Array.isArray(a.photos) && a.photos.length >= 1);
    assert.ok(a.photos[0].src.length > 0);
    assert.equal(a.image, a.photos[0].src);
    assert.ok(Array.isArray(a.achievements));
    assert.ok(a.achievements.filter((x) => x.isProudest).length <= 1);
  }
});
