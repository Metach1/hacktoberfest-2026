import test from "node:test";
import assert from "node:assert/strict";
import {
  commitDraft,
  draftErrors,
  isDraftValid,
  isDirty,
} from "../src/app/lib/profile-draft.mjs";

const baseDraft = {
  id: 1,
  name: "Mikaela Solis",
  location: "Quezon City",
  bio: "Runner.",
  sport: "Track and Field",
  goal: 80000,
  photos: [{ id: "p1", src: "a.jpg" }],
  achievements: [{ id: "a1", title: "Finalist", isProudest: true }],
};

test("a draft requires a name and a positive goal", () => {
  assert.equal(isDraftValid(baseDraft), true);
  assert.match(draftErrors({ ...baseDraft, name: "  " }).name, /required/i);
  assert.match(draftErrors({ ...baseDraft, goal: 0 }).goal, /greater than zero/i);
  assert.match(draftErrors({ ...baseDraft, goal: -5 }).goal, /greater than zero/i);
});

test("PREVIEW does not save: commitDraft(draft, false) returns null", () => {
  assert.equal(commitDraft(baseDraft, false), null);
});

test("an invalid draft never saves even when confirmed", () => {
  assert.equal(commitDraft({ ...baseDraft, name: "" }, true), null);
  assert.equal(commitDraft({ ...baseDraft, goal: 0 }, true), null);
});

test("only a confirmed, valid draft produces a patch to persist", () => {
  const patch = commitDraft(baseDraft, true);
  assert.ok(patch);
  assert.equal(patch.name, "Mikaela Solis");
  assert.equal(patch.goal, 80000);
  assert.deepEqual(patch.photos.map((p) => p.id), ["p1"]);
  assert.deepEqual(patch.achievements.map((a) => a.id), ["a1"]);
});

test("commit trims the name and location", () => {
  const patch = commitDraft({ ...baseDraft, name: "  Mikaela  ", location: "  Cebu  " }, true);
  assert.equal(patch.name, "Mikaela");
  assert.equal(patch.location, "Cebu");
});

test("isDirty detects unsaved edits against the stored athlete", () => {
  assert.equal(isDirty(baseDraft, baseDraft), false);
  assert.equal(isDirty(baseDraft, { ...baseDraft, bio: "changed" }), true);
});
