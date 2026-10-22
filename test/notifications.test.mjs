import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNotification,
  notificationsForRole,
  unreadCountForRole,
  markRead,
  markAllRead,
  audienceForRole,
  donationStatusNotification,
  donationResubmissionNotification,
  postLikeNotification,
  postCommentNotification,
} from "../src/app/lib/notifications.mjs";
import {
  createPendingDonation,
  rejectDonation,
  resubmitDonation,
} from "../src/app/lib/donations.mjs";

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

// --- Pure action-to-event rules used by the store ----------------------------

test("donation decisions produce one event only for a pending donation", () => {
  const pending = { id: "d1", status: "pending" };
  const confirmedEvent = donationStatusNotification(pending, "confirmed", { amount: 500 });
  assert.deepEqual(confirmedEvent, { type: "donation_confirmed", data: { amount: 500 } });
  assert.equal(
    donationStatusNotification({ ...pending, status: "confirmed" }, "confirmed", {}),
    null,
    "idempotent confirm emits nothing",
  );

  const rejectedEvent = donationStatusNotification(pending, "rejected", { amount: 500, reasonLabel: "Wrong image" });
  assert.deepEqual(rejectedEvent, {
    type: "donation_rejected",
    data: { amount: 500, reasonLabel: "Wrong image" },
  });
  assert.equal(
    donationStatusNotification({ ...pending, status: "rejected" }, "rejected", {}),
    null,
    "idempotent reject emits nothing",
  );
  assert.equal(donationStatusNotification({ ...pending, status: "confirmed" }, "rejected", {}), null);
});

test("successful donation resubmission emits one pending event using edited values", () => {
  const rejected = rejectDonation(
    createPendingDonation({
      athleteId: 1,
      amount: 500,
      supporterId: "supporter",
      supporterName: "Original supporter",
      createdAt: 100,
    }),
    "wrong_image",
    "",
    200,
  );
  const next = resubmitDonation(
    rejected,
    "supporter",
    { amount: 750, supporterName: "Updated supporter" },
    300,
  );
  const events = [donationResubmissionNotification(rejected, next)].filter(Boolean);

  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    type: "donation_pending",
    data: { amount: 750, supporterName: "Updated supporter" },
  });
  const notification = buildNotification(events[0]);
  assert.equal(notification.audience, "athlete");
  assert.match(notification.body, /₱750/);
  assert.match(notification.body, /from Updated supporter/);
  assert.equal(next.createdAt, 300, "resubmission refreshes the record timestamp");
});

test("failed donation resubmissions emit no pending notification", () => {
  const rejected = rejectDonation(
    createPendingDonation({ athleteId: 1, amount: 500, supporterId: "supporter" }),
    "wrong_image",
  );
  const wrongOwner = resubmitDonation(rejected, "another-supporter", { amount: 750 }, 300);
  assert.equal(donationResubmissionNotification(rejected, wrongOwner), null);

  const pending = createPendingDonation({ athleteId: 1, amount: 500, supporterId: "supporter" });
  const noOp = resubmitDonation(pending, "supporter", { amount: 750 }, 300);
  assert.equal(donationResubmissionNotification(pending, noOp), null);
});

test("liking produces one event only when adding another actor's like", () => {
  const post = { authorAthleteId: 1, likedBy: [], text: "Training update" };
  assert.deepEqual(postLikeNotification(post, "supporter", "A supporter"), {
    type: "post_like",
    data: { actorName: "A supporter", text: "Training update" },
  });
  assert.equal(
    postLikeNotification({ ...post, likedBy: ["supporter"] }, "supporter", "A supporter"),
    null,
    "removing a like emits nothing",
  );
  assert.equal(postLikeNotification(post, 1, "Ana"), null, "author liking own post emits nothing");
});

test("commenting produces one event only when the commenter is not the author", () => {
  const post = { authorAthleteId: 1 };
  assert.deepEqual(postCommentNotification(post, "supporter", "A supporter", "Great work!"), {
    type: "post_comment",
    data: { actorName: "A supporter", text: "Great work!" },
  });
  assert.equal(
    postCommentNotification(post, 1, "Ana", "My own post"),
    null,
    "author commenting on own post emits nothing",
  );
});

test("post self-notifications use Supabase owner IDs when available", () => {
  const post = {
    authorAthleteId: 0,
    ownerId: "athlete-user-id",
    likedBy: [],
    text: "Database-backed post",
  };
  assert.equal(
    postLikeNotification(post, 1, "Athlete", "athlete-user-id"),
    null,
    "an athlete does not receive a notification for their own like",
  );
  assert.equal(
    postCommentNotification(post, 1, "Athlete", "My post", "athlete-user-id"),
    null,
    "an athlete does not receive a notification for their own comment",
  );
  assert.deepEqual(postLikeNotification(post, "supporter", "Supporter", "supporter-user-id"), {
    type: "post_like",
    data: { actorName: "Supporter", text: "Database-backed post" },
  });
});
