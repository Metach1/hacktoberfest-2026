"use client";

import { createClient } from "@/src/app/lib/supabase/client";

/** One row of an athlete's "top donors" list (their supporters by amount). */
export interface TopDonorRow {
  donorId: string;
  donor: string;
  total: number;
  count: number;
  latestAt: number;
}

/** One row of the "top athletes" leaderboard (by total confirmed received). */
export interface TopAthleteRow {
  athleteId: string;
  name: string;
  total: number;
  count: number;
}

/** One row of the "trending athletes" leaderboard (by distinct supporters). */
export interface TrendingAthleteRow {
  athleteId: string;
  name: string;
  supporters: number;
}

interface TopDonorDbRow {
  donor_id: string;
  donor_name: string;
  total: number | string;
  donation_count: number | string;
  latest_at: string | null;
}

interface TopAthleteDbRow {
  athlete_id: string;
  athlete_name: string;
  total: number | string;
  donation_count: number | string;
}

interface TrendingAthleteDbRow {
  athlete_id: string;
  athlete_name: string;
  supporter_count: number | string;
}

// --- Pure mappers (unit-tested; no Supabase dependency) ---------------------

export function mapTopDonor(row: TopDonorDbRow): TopDonorRow {
  return {
    donorId: String(row.donor_id),
    donor: row.donor_name ?? "Anonymous supporter",
    total: Number(row.total ?? 0),
    count: Number(row.donation_count ?? 0),
    latestAt: row.latest_at ? new Date(row.latest_at).getTime() : 0,
  };
}

export function mapTopAthlete(row: TopAthleteDbRow): TopAthleteRow {
  return {
    athleteId: String(row.athlete_id),
    name: row.athlete_name ?? "Athlete",
    total: Number(row.total ?? 0),
    count: Number(row.donation_count ?? 0),
  };
}

export function mapTrendingAthlete(row: TrendingAthleteDbRow): TrendingAthleteRow {
  return {
    athleteId: String(row.athlete_id),
    name: row.athlete_name ?? "Athlete",
    supporters: Number(row.supporter_count ?? 0),
  };
}

// --- RPC calls --------------------------------------------------------------

/**
 * Top donors FOR A SPECIFIC ATHLETE, ranked by total confirmed amount given.
 * Scoped to the supporters of `athleteId` (the athlete's Supabase owner UUID);
 * this is the backend counterpart of the per-athlete "Top donors" popup, not a
 * global ranking.
 */
export async function listTopDonors(
  athleteId: string,
  limit = 10,
): Promise<TopDonorRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leaderboard_top_donors", {
    athlete_id: athleteId,
    limit_count: limit,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as TopDonorDbRow[]).map(mapTopDonor);
}

/** Athletes ranked by total confirmed donations received (global). */
export async function listTopAthletes(limit = 10): Promise<TopAthleteRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leaderboard_top_athletes", {
    limit_count: limit,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as TopAthleteDbRow[]).map(mapTopAthlete);
}

/** Athletes ranked by distinct supporter count — breadth, not amount (global). */
export async function listTrendingAthletes(limit = 10): Promise<TrendingAthleteRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leaderboard_trending_athletes", {
    limit_count: limit,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as TrendingAthleteDbRow[]).map(mapTrendingAthlete);
}
