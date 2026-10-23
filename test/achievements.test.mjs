import test from "node:test";
import assert from "node:assert/strict";
import {
  TITLE_MAX,
  DESCRIPTION_MAX,
  validateAchievement,
  buildAchievement,
  addAchievement,
  editAchievement,
  deleteAchievement,
  markProudest,
  proudestAchievement,
  proudestCount,
  sortNewestFirst,
} from "../src/app/lib/achievements.mjs";

const NOW = Date.parse("2026-06-15T00:00:00Z");

test("title is required", () => {
  const r = validateAchievement({ title: "   " }, NOW);
  assert.equal(r.ok, false);
  assert.match(r.errors.title, /required/i);
});

test("title length is capped", () => {
  const r = validateAchievement({ title: "x".repeat(TITLE_MAX + 1) }, NOW);
  assert.equal(r.ok, false);
  assert.match(r.errors.title, new RegExp(String(TITLE_MAX)));
});

test("description length is capped", () => {
  const r = validateAchievement({ title: "ok", description: "y".repeat(DESCRIPTION_MAX + 1) }, NOW);
  assert.equal(r.ok, false);
  assert.match(r.errors.description, new RegExp(String(DESCRIPTION_MAX)));
});

test("a future date is rejected (year and full date)", () => {
  assert.equal(validateAchievement({ title: "ok", date: "2027" }, NOW).ok, false);
  assert.equal(validateAchievement({ title: "ok", date: "2026-12-31" }, NOW).ok, false);
});

test("today and past dates are accepted; blank date is fine", () => {
  assert.equal(validateAchievement({ title: "ok", date: "2026-06-15" }, NOW).ok, true);
  assert.equal(validateAchievement({ title: "ok", date: "2024" }, NOW).ok, true);
  assert.equal(validateAchievement({ title: "ok", date: "" }, NOW).ok, true);
});

test("an invalid date string is rejected", () => {
  const r = validateAchievement({ title: "ok", date: "not-a-date" }, NOW);
  assert.equal(r.ok, false);
  assert.match(r.errors.date, /valid date/i);
});

test("validate trims fields on success", () => {
  const r = validateAchievement({ title: "  Gold  ", event: "  Meet  " }, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.fields.title, "Gold");
  assert.equal(r.fields.event, "Meet");
});

test("buildAchievement produces a record that is not proudest by default", () => {
  const r = buildAchievement(1, { title: "Regional finalist", date: "2025" }, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.achievement.isProudest, false);
  assert.ok(r.achievement.id);
});

test("marking proudest leaves EXACTLY ONE proudest and clears the previous", () => {
  let list = [
    { id: "a", title: "A", isProudest: true },
    { id: "b", title: "B", isProudest: false },
    { id: "c", title: "C", isProudest: false },
  ];
  list = markProudest(list, "b");
  assert.equal(proudestCount(list), 1);
  assert.equal(list.find((x) => x.isProudest).id, "b");
  // mark another -> still exactly one, previous cleared
  list = markProudest(list, "c");
  assert.equal(proudestCount(list), 1);
  assert.equal(list.find((x) => x.isProudest).id, "c");
});

test("add/edit/delete are pure and id-scoped", () => {
  let list = addAchievement([], { id: "a", title: "A", isProudest: false });
  list = addAchievement(list, { id: "b", title: "B", isProudest: false });
  assert.equal(list.length, 2);
  list = editAchievement(list, "a", { title: "A2" });
  assert.equal(list.find((x) => x.id === "a").title, "A2");
  list = deleteAchievement(list, "b");
  assert.deepEqual(list.map((x) => x.id), ["a"]);
});

test("proudestAchievement returns the flagged one, else the newest", () => {
  const flagged = [
    { id: "a", title: "A", date: "2020", isProudest: false },
    { id: "b", title: "B", date: "2019", isProudest: true },
  ];
  assert.equal(proudestAchievement(flagged).id, "b");
  const none = [
    { id: "a", title: "A", date: "2020", isProudest: false },
    { id: "b", title: "B", date: "2023", isProudest: false },
  ];
  assert.equal(proudestAchievement(none).id, "b"); // newest
  assert.equal(proudestAchievement([]), null);
});

test("sortNewestFirst orders by date desc, undated last, stable ties", () => {
  const list = [
    { id: "a", date: "2020" },
    { id: "b", date: "" },
    { id: "c", date: "2024" },
    { id: "d", date: "2024" },
  ];
  assert.deepEqual(sortNewestFirst(list).map((x) => x.id), ["c", "d", "a", "b"]);
});
