import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNotification,
  notificationsForRole,
  unreadCountForRole,
  markRead,
  markAllRead,
  audienceForRole,
} from "../src/app/lib/notifications.mjs";

/**
 * Pure notification logic. The store stamps id/createdAt/read and emits from
 * existing actions; here we cover the builder (one payload per event type),
 * role/audience filtering, and the unread/mark-read reducers. Self-notification
 * suppression (own-post like/comment) and like-removal emitting nothing are
 * store-level rules, modeled below as a small reducer mirroring the store.
 */

test("buildNotification covers each event type with the right audience", () => {
  assert.equal(buildNotification({ type: "donation_pending", data: { amount: 500, athleteName: "Ana" } }).audience, "athlete");
  assert.equal(buildNotification({ type: "post_like", data: { actorName: "Ben" } }).audience, "athlete");
  assert.equal(buildNotification({ type: "post_comment", data: { actorName: "Ben" } }).audience, "athlete");
  assert.equal(buildNotification({ type: "donation_confirmed", data: { amount: 500 } }).audience, "supporter");
  assert.equal(buildNotification({ type: "donation_rejected", data: { amount: 500, reasonLabel: "Wrong image" } }).audience, "supporter");
  assert.equal(buildNotification({ type: "new_post", data: { athleteName: "Ana", text: "hi" } }).audience, "supporter");
  assert.equal(buildNotification({ type: "unknown" }), null, "unknown type -> nothing");
});

test("buildNotification includes key facts in the copy", () => {
  // Athlete-facing: the pending donation is "from" the supporter, not "to" the athlete.
  const pending = buildNotification({ type: "donation_pending", data: { amount: 1500, supporterName: "Nina" } });
  assert.match(pending.body, /₱1,500/);
  assert.match(pending.body, /from Nina/);
  assert.doesNotMatch(pending.body, / to /, "athlete-side copy must not read 'to <athlete>'");
  // Falls back to "Anonymous supporter" when no supporter name is given.
  const anon = buildNotification({ type: "donation_pending", data: { amount: 118 } });
  assert.match(anon.body, /from Anonymous supporter/);
  const rejected = buildNotification({ type: "donation_rejected", data: { amount: 200, athleteName: "Ana", reasonLabel: "Wrong image" } });
  assert.match(rejected.body, /Wrong image/);
});

test("audienceForRole maps role to audience (null for no role)", () => {
  assert.equal(audienceForRole("athlete"), "athlete");
  assert.equal(audienceForRole("supporter"), "supporter");
  assert.equal(audienceForRole(null), null);
});

const now = Date.now();
const SAMPLE = [
  { id: "a1", audience: "athlete", type: "post_like", title: "", body: "", createdAt: now - 3000, read: false },
  { id: "a2", audience: "athlete", type: "post_comment", title: "", body: "", createdAt: now - 1000, read: true },
  { id: "s1", audience: "supporter", type: "new_post", title: "", body: "", createdAt: now - 2000, read: false },
];

test("notificationsForRole filters by audience, newest first, none for null role", () => {
  const athlete = notificationsForRole(SAMPLE, "athlete");
  assert.deepEqual(athlete.map((n) => n.id), ["a2", "a1"], "athlete audience, newest first");
  const supporter = notificationsForRole(SAMPLE, "supporter");
  assert.deepEqual(supporter.map((n) => n.id), ["s1"]);
  assert.deepEqual(notificationsForRole(SAMPLE, null), [], "no role -> nothing");
});

test("unreadCountForRole counts only the role's unread notifications", () => {
  assert.equal(unreadCountForRole(SAMPLE, "athlete"), 1, "a1 unread, a2 read");
  assert.equal(unreadCountForRole(SAMPLE, "supporter"), 1);
  assert.equal(unreadCountForRole(SAMPLE, null), 0);
});

test("markRead marks a single notification; markAllRead scopes to the role", () => {
  const afterOne = markRead(SAMPLE, "a1");
  assert.equal(afterOne.find((n) => n.id === "a1").read, true);
  assert.equal(afterOne.find((n) => n.id === "s1").read, false, "other audience untouched");

  const afterAll = markAllRead(SAMPLE, "athlete");
  assert.equal(unreadCountForRole(afterAll, "athlete"), 0, "all athlete read");
  assert.equal(unreadCountForRole(afterAll, "supporter"), 1, "supporter unaffected");
});

// --- Store-level emission rules (mirrored reducers) --------------------------

/** Mirrors toggleLike's emit rule: only when a like is ADDED and liker != author. */
function likeEmits({ alreadyLiked, actorId, authorAthleteId }) {
  return !alreadyLiked && actorId !== authorAthleteId;
}

test("liking emits only when adding a like and not the post's author", () => {
  assert.equal(likeEmits({ alreadyLiked: false, actorId: "supporter", authorAthleteId: 1 }), true);
  assert.equal(likeEmits({ alreadyLiked: true, actorId: "supporter", authorAthleteId: 1 }), false, "removing a like emits nothing");
  assert.equal(likeEmits({ alreadyLiked: false, actorId: 1, authorAthleteId: 1 }), false, "author liking own post emits nothing");
});

/** Mirrors addComment's emit rule: only when commenter != post author. */
function commentEmits({ authorId, postAuthorAthleteId }) {
  return authorId !== postAuthorAthleteId;
}

test("commenting emits only when the commenter is not the post's author", () => {
  assert.equal(commentEmits({ authorId: "supporter", postAuthorAthleteId: 1 }), true);
  assert.equal(commentEmits({ authorId: 1, postAuthorAthleteId: 1 }), false, "author commenting on own post emits nothing");
});

/** Mirrors the "status actually changed" guard for confirm/reject emits. */
function statusChangeEmits(before, after) {
  return before !== after;
}

test("donation confirm/reject emits only when the status actually changed", () => {
  assert.equal(statusChangeEmits("pending", "confirmed"), true);
  assert.equal(statusChangeEmits("confirmed", "confirmed"), false, "idempotent confirm emits nothing");
  assert.equal(statusChangeEmits("rejected", "rejected"), false);
});
