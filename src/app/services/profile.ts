"use client";

/**
 * Profile service — reads and writes the SIGNED-IN user's own profile, backed
 * by Supabase. A user has a `profiles` row (all users) and, if they are an
 * athlete, an `athlete_profiles` row with athlete-specific fields.
 *
 * RLS ensures a user can only read/write their own rows.
 */
import { createClient } from "@/src/app/lib/supabase/client";

export interface MyProfile {
  id: string;
  role: "athlete" | "supporter";
  firstName: string;
  lastName: string;
  bio: string;
  profilePicture: string;
  // Athlete-only (empty/zero for supporters):
  sport: string;
  location: string;
  fundingGoal: number | null;
}

/** Load the current user's full profile (profiles + athlete_profiles). */
export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;

  const { data: prof, error } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, bio, profile_picture")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!prof) return null;

  let sport = "";
  let location = "";
  let fundingGoal: number | null = null;
  if (prof.role === "athlete") {
    const { data: ap } = await supabase
      .from("athlete_profiles")
      .select("sport, location, funding_goal")
      .eq("user_id", uid)
      .maybeSingle();
    sport = ap?.sport ?? "";
    location = ap?.location ?? "";
    fundingGoal = ap?.funding_goal ?? null;
  }

  return {
    id: prof.id,
    role: prof.role,
    firstName: prof.first_name ?? "",
    lastName: prof.last_name ?? "",
    bio: prof.bio ?? "",
    profilePicture: prof.profile_picture ?? "",
    sport,
    location,
    fundingGoal,
  };
}

export interface UpdateMyProfileInput {
  firstName: string;
  lastName?: string;
  bio: string;
  // Athlete-only:
  sport?: string;
  location?: string;
  fundingGoal?: number | null;
}

/**
 * Update the current user's profile. Writes `profiles` for everyone, and
 * upserts `athlete_profiles` for athletes. Validates the funding goal.
 */
export async function updateMyProfile(input: UpdateMyProfileInput): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You must be signed in.");

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
  const role = prof?.role as "athlete" | "supporter" | undefined;

  const { error: pErr } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName.trim() || null,
      last_name: input.lastName?.trim() || null,
      bio: input.bio.trim() || null,
    })
    .eq("id", uid);
  if (pErr) throw new Error(pErr.message);

  if (role === "athlete") {
    if (input.fundingGoal != null && !(Number.isFinite(input.fundingGoal) && input.fundingGoal > 0)) {
      throw new Error("Funding goal must be greater than zero.");
    }
    const { error: aErr } = await supabase
      .from("athlete_profiles")
      .upsert(
        {
          user_id: uid,
          sport: input.sport?.trim() || null,
          location: input.location?.trim() || null,
          funding_goal: input.fundingGoal ?? null,
        },
        { onConflict: "user_id" },
      );
    if (aErr) throw new Error(aErr.message);
  }
}
