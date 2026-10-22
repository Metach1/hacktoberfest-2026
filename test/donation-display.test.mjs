import test from "node:test";
import assert from "node:assert/strict";

import {
  createPendingDonation,
  confirmDonation,
  rejectDonation,
  confirmedDonationsForAthlete,
  recentConfirmedDonations,
  topDonorsForAthlete,
  donorKey,
} from "../src/app/lib/donations.mjs";

/** Build a confirmed donation with explicit fields for deterministic tests. */
function confirmed({ athleteId, amount, name, at, id }) {
  return confirmDonation(
    createPendingDonation({ athleteId, amount, supporterName: name, createdAt: at, id }),
    "athlete",
    at + 1,
  );
}

test("confirmedDonationsForAthlete returns only that athlete's confirmed donations", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 500, name: "Ana", at: 100, id: "a" }),
    confirmed({ athleteId: 2, amount: 999, name: "Ben", at: 200, id: "b" }), // other athlete
    createPendingDonation({ athleteId: 1, amount: 300, supporterName: "Cita", createdAt: 150, id: "c" }), // pending
    rejectDonation(createPendingDonation({ athleteId: 1, amount: 400, createdAt: 160, id: "d" }), "wrong_image"), // rejected
  ];
  const result = confirmedDonationsForAthlete(donations, 1);
  assert.deepEqual(result.map((d) => d.id), ["a"], "excludes other athletes, pending, and rejected");
});

test("confirmedDonationsForAthlete orders newest first", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 100, name: "Old", at: 100, id: "old" }),
    confirmed({ athleteId: 1, amount: 200, name: "New", at: 300, id: "new" }),
    confirmed({ athleteId: 1, amount: 150, name: "Mid", at: 200, id: "mid" }),
  ];
  assert.deepEqual(confirmedDonationsForAthlete(donations, 1).map((d) => d.id), ["new", "mid", "old"]);
});

test("recentConfirmedDonations returns at most five, newest first", () => {
  const donations = Array.from({ length: 8 }, (_, i) =>
    confirmed({ athleteId: 1, amount: 100 + i, name: `D${i}`, at: i * 100, id: `d${i}` }),
  );
  const recent = recentConfirmedDonations(donations, 1, 5);
  assert.equal(recent.length, 5);
  // Newest (highest `at`) first: d7, d6, d5, d4, d3.
  assert.deepEqual(recent.map((d) => d.id), ["d7", "d6", "d5", "d4", "d3"]);
});

test("recentConfirmedDonations returns everything when fewer than the limit", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 100, name: "A", at: 100, id: "a" }),
    confirmed({ athleteId: 1, amount: 200, name: "B", at: 200, id: "b" }),
  ];
  assert.equal(recentConfirmedDonations(donations, 1, 5).length, 2);
  assert.equal(recentConfirmedDonations(donations, 99, 5).length, 0, "empty for an athlete with none");
});

test("topDonorsForAthlete ranks donors by total confirmed contribution", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 500, name: "Ana", at: 100, id: "a1" }),
    confirmed({ athleteId: 1, amount: 700, name: "Ana", at: 300, id: "a2" }), // Ana total 1200
    confirmed({ athleteId: 1, amount: 1000, name: "Ben", at: 200, id: "b1" }), // Ben total 1000
    confirmed({ athleteId: 1, amount: 250, name: "Cy", at: 400, id: "c1" }), // Cy total 250
  ];
  const top = topDonorsForAthlete(donations, 1);
  assert.deepEqual(top.map((t) => t.donor), ["Ana", "Ben", "Cy"]);
  assert.equal(top[0].total, 1200);
  assert.equal(top[0].count, 2);
  assert.equal(top[1].total, 1000);
});

test("topDonorsForAthlete excludes pending/rejected and other athletes", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 500, name: "Ana", at: 100, id: "a" }),
    createPendingDonation({ athleteId: 1, amount: 9999, supporterName: "Ana", createdAt: 120, id: "p" }), // pending
    rejectDonation(createPendingDonation({ athleteId: 1, amount: 9999, supporterName: "Ben", createdAt: 130, id: "r" }), "other"),
    confirmed({ athleteId: 2, amount: 9999, name: "Ana", at: 140, id: "x" }), // other athlete
  ];
  const top = topDonorsForAthlete(donations, 1);
  assert.deepEqual(top, [
    { id: "Ana", donor: "Ana", total: 500, count: 1, latestAt: 100 },
  ]);
});

test("topDonorsForAthlete keeps each anonymous donation as its own row", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 300, name: "", at: 100, id: "anon1" }),
    confirmed({ athleteId: 1, amount: 700, name: "   ", at: 300, id: "anon2" }), // blank -> anonymous
    confirmed({ athleteId: 1, amount: 500, name: "Ana", at: 200, id: "a1" }),
  ];
  const top = topDonorsForAthlete(donations, 1);
  // Two separate anonymous rows (not one combined 1000 total).
  const anon = top.filter((t) => t.donor === "Anonymous supporter");
  assert.equal(anon.length, 2, "two anonymous donations stay separate");
  for (const row of anon) assert.equal(row.count, 1, "each anonymous row counts a single donation");
  assert.deepEqual(
    anon.map((t) => t.total).sort((a, b) => a - b),
    [300, 700],
    "each anonymous row shows its own donation amount",
  );
  // Rows are keyed by donation id for anonymous donations.
  assert.deepEqual(anon.map((t) => t.id).sort(), ["anon1", "anon2"]);
  // Ranking by total: 700 (anon2) > 500 (Ana) > 300 (anon1). The named row's
  // id is the donor name; anonymous rows are keyed by donation id.
  assert.deepEqual(top.map((t) => t.id), ["anon2", "Ana", "anon1"]);
});

test("topDonorsForAthlete still aggregates named donors while anonymous stay separate", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 400, name: "Ana", at: 100, id: "a1" }),
    confirmed({ athleteId: 1, amount: 400, name: "Ana", at: 200, id: "a2" }), // Ana total 800, count 2
    confirmed({ athleteId: 1, amount: 100, name: "", at: 300, id: "x1" }),
    confirmed({ athleteId: 1, amount: 100, name: "", at: 400, id: "x2" }),
  ];
  const top = topDonorsForAthlete(donations, 1);
  const ana = top.find((t) => t.donor === "Ana");
  assert.equal(ana.total, 800, "named donor aggregates totals");
  assert.equal(ana.count, 2, "named donor aggregates counts");
  assert.equal(ana.id, "Ana", "named donor row keyed by name");
  const anon = top.filter((t) => t.donor === "Anonymous supporter");
  assert.equal(anon.length, 2, "anonymous donations are not aggregated");
});

test("topDonorsForAthlete excludes pending/rejected anonymous donations", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 200, name: "", at: 100, id: "ok" }),
    createPendingDonation({ athleteId: 1, amount: 9999, supporterName: "", createdAt: 120, id: "pend" }),
    rejectDonation(createPendingDonation({ athleteId: 1, amount: 9999, supporterName: "", createdAt: 130, id: "rej" }), "other"),
  ];
  const top = topDonorsForAthlete(donations, 1);
  assert.deepEqual(top, [
    { id: "ok", donor: "Anonymous supporter", total: 200, count: 1, latestAt: 100 },
  ], "only the confirmed anonymous donation is ranked");
});

test("ties between anonymous rows are broken deterministically by id", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 500, name: "", at: 100, id: "zzz" }),
    confirmed({ athleteId: 1, amount: 500, name: "", at: 100, id: "aaa" }),
  ];
  const top = topDonorsForAthlete(donations, 1);
  // Equal total and latestAt -> stable order by id ascending.
  assert.deepEqual(top.map((t) => t.id), ["aaa", "zzz"]);
});

test("topDonorsForAthlete does not merge different names or split a shared name", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 100, name: "Jamie", at: 100, id: "j1" }),
    confirmed({ athleteId: 1, amount: 100, name: "jamie", at: 200, id: "j2" }), // different case = different key
    confirmed({ athleteId: 1, amount: 100, name: "Jamie", at: 300, id: "j3" }), // same as j1
  ];
  const top = topDonorsForAthlete(donations, 1);
  const byDonor = Object.fromEntries(top.map((t) => [t.donor, t]));
  assert.equal(byDonor["Jamie"].count, 2, "same exact name grouped");
  assert.equal(byDonor["jamie"].count, 1, "different name not merged");
});

test("donorKey falls back to Anonymous supporter for blank names", () => {
  assert.equal(donorKey({ supporterName: "  " }), "Anonymous supporter");
  assert.equal(donorKey({ supporterName: "Nina A." }), "Nina A.");
  assert.equal(donorKey({}), "Anonymous supporter");
});

test("ties in total are broken by most recent contribution", () => {
  const donations = [
    confirmed({ athleteId: 1, amount: 500, name: "Early", at: 100, id: "e" }),
    confirmed({ athleteId: 1, amount: 500, name: "Late", at: 900, id: "l" }),
  ];
  const top = topDonorsForAthlete(donations, 1);
  assert.deepEqual(top.map((t) => t.donor), ["Late", "Early"], "equal totals -> more recent first");
});
