import test from "node:test";
import assert from "node:assert/strict";

// The leaderboard service is TypeScript with a "use client" + Supabase import,
// so it can't be imported directly by the Node runner. These tests cover the
// pure row-mapping contract (snake_case DB row -> camelCase record) by mirroring
// the mappers' behavior; if the service mappers change shape, update here too.
//
// Keeping the mapping logic pure and trivial is intentional: the ranking itself
// lives in SQL (tie-breaks, confirmed-only, per-athlete scoping, anonymous
// rows), exercised against the database, while the client only adapts types.

function mapTopDonor(row) {
  return {
    donorId: String(row.donor_id),
    donor: row.donor_name ?? "Anonymous supporter",
    total: Number(row.total ?? 0),
    count: Number(row.donation_count ?? 0),
    latestAt: row.latest_at ? new Date(row.latest_at).getTime() : 0,
  };
}

function mapTopAthlete(row) {
  return {
    athleteId: String(row.athlete_id),
    name: row.athlete_name ?? "Athlete",
    total: Number(row.total ?? 0),
    count: Number(row.donation_count ?? 0),
  };
}

function mapTrendingAthlete(row) {
  return {
    athleteId: String(row.athlete_id),
    name: row.athlete_name ?? "Athlete",
    supporters: Number(row.supporter_count ?? 0),
  };
}

test("mapTopDonor adapts a donor row and parses numeric/text fields", () => {
  const ts = "2026-10-23T05:00:00.000Z";
  assert.deepEqual(
    mapTopDonor({
      donor_id: "supporter-uuid",
      donor_name: "Nina",
      total: "1500",
      donation_count: "3",
      latest_at: ts,
    }),
    {
      donorId: "supporter-uuid",
      donor: "Nina",
      total: 1500,
      count: 3,
      latestAt: new Date(ts).getTime(),
    },
  );
});

test("mapTopDonor falls back to Anonymous supporter and epoch 0", () => {
  const row = mapTopDonor({ donor_id: "don-1", donor_name: null, total: 500, donation_count: 1, latest_at: null });
  assert.equal(row.donor, "Anonymous supporter");
  assert.equal(row.latestAt, 0);
  assert.equal(row.total, 500);
});

test("mapTopAthlete adapts an athlete row with name fallback", () => {
  assert.deepEqual(
    mapTopAthlete({ athlete_id: "a-uuid", athlete_name: "Ana Cruz", total: 9000, donation_count: "12" }),
    { athleteId: "a-uuid", name: "Ana Cruz", total: 9000, count: 12 },
  );
  assert.equal(mapTopAthlete({ athlete_id: "x", athlete_name: null, total: 0, donation_count: 0 }).name, "Athlete");
});

test("mapTrendingAthlete adapts a trending row (supporter breadth)", () => {
  assert.deepEqual(
    mapTrendingAthlete({ athlete_id: "a-uuid", athlete_name: "Ana Cruz", supporter_count: "7" }),
    { athleteId: "a-uuid", name: "Ana Cruz", supporters: 7 },
  );
  assert.equal(mapTrendingAthlete({ athlete_id: "x", athlete_name: null, supporter_count: 0 }).name, "Athlete");
});
