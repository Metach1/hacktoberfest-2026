"use client";

import { createClient } from "@/src/app/lib/supabase/client";
import type { QrCodeRow } from "@/src/app/services/qr";

export interface PublicAthlete {
  id: string;
  name: string;
  sport: string;
  location: string;
  regionCode: string;
  image: string;
  raised: number;
  goal: number;
  supporters: number;
  verified: boolean;
  bio: string;
  achievement: string;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
  bio: string | null;
}

interface AthleteProfileRow {
  user_id: string;
  sport: string | null;
  region_code: string | null;
  location: string | null;
  bio: string | null;
  achievement: string | null;
  funding_goal: number | null;
  verified: boolean;
}

interface PublicSupportTotalRow {
  athlete_owner_id: string;
  raised: number | string;
  supporters: number | string;
}

async function loadPublicAthletes(ownerId?: string): Promise<PublicAthlete[]> {
  const supabase = createClient();
  let profileQuery = supabase
    .from("profiles")
    .select("id, first_name, last_name, profile_picture, bio")
    .eq("role", "athlete")
    .order("created_at", { ascending: false });
  if (ownerId) profileQuery = profileQuery.eq("id", ownerId);

  const { data: profileData, error: profileError } = await profileQuery;
  if (profileError) throw new Error(profileError.message);
  const profiles = (profileData ?? []) as ProfileRow[];
  if (!profiles.length) return [];

  const ownerIds = profiles.map((profile) => profile.id);
  const [athleteProfilesResult, qrResult, totalsResult] = await Promise.all([
    supabase
      .from("athlete_profiles")
      .select("user_id, sport, region_code, location, bio, achievement, funding_goal, verified")
      .in("user_id", ownerIds),
    supabase
      .from("qr_codes")
      .select("owner_id")
      .in("owner_id", ownerIds),
    supabase.rpc("public_athlete_support_totals", { athlete_ids: ownerIds }),
  ]);
  if (athleteProfilesResult.error) throw new Error(athleteProfilesResult.error.message);
  if (qrResult.error) throw new Error(qrResult.error.message);
  if (totalsResult.error) throw new Error(totalsResult.error.message);

  const athleteProfileById = new Map(
    ((athleteProfilesResult.data ?? []) as AthleteProfileRow[]).map((profile) => [profile.user_id, profile]),
  );
  const qrOwnerIds = new Set(
    ((qrResult.data ?? []) as Array<{ owner_id: string | null }>)
      .map((row) => row.owner_id)
      .filter((id): id is string => Boolean(id)),
  );
  const totals = new Map(
    ((totalsResult.data ?? []) as PublicSupportTotalRow[]).map((row) => [
      row.athlete_owner_id,
      { raised: Number(row.raised), supporters: Number(row.supporters) },
    ]),
  );

  return profiles
    .filter((profile) => qrOwnerIds.has(profile.id))
    .map((profile) => {
      const athleteProfile = athleteProfileById.get(profile.id);
      const total = totals.get(profile.id);
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
      return {
        id: profile.id,
        name: name || "Athlete",
        sport: athleteProfile?.sport ?? "",
        location: athleteProfile?.location ?? "",
        regionCode: athleteProfile?.region_code ?? "",
        image: profile.profile_picture ?? "/athlete-placeholder.svg",
        raised: total?.raised ?? 0,
        goal: athleteProfile?.funding_goal ?? 0,
        supporters: total?.supporters ?? 0,
        verified: athleteProfile?.verified ?? false,
        bio: athleteProfile?.bio ?? profile.bio ?? "",
        achievement: athleteProfile?.achievement ?? "",
      };
    });
}

/** Return registered athlete accounts that have at least one published payment QR. */
export function getPublicAthletes(): Promise<PublicAthlete[]> {
  return loadPublicAthletes();
}

/** Return one registered athlete account, or null if it isn't publicly listed. */
export async function getPublicAthlete(ownerId: string): Promise<PublicAthlete | null> {
  const athletes = await loadPublicAthletes(ownerId);
  return athletes[0] ?? null;
}

/** Load an athlete's publicly published payment QR codes. */
export async function getPublicAthleteQrCodes(ownerId: string): Promise<QrCodeRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, method, label, account_number, image")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    method: row.method,
    label: row.label,
    accountNumber: row.account_number ?? "",
    image: row.image ?? "",
  }));
}
