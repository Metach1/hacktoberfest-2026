"use client";

/**
 * Profile service — reads and writes the SIGNED-IN user's own profile, backed
 * by Supabase. A user has a `profiles` row (all users) and, if they are an
 * athlete, an `athlete_profiles` row with athlete-specific fields.
 *
 * RLS ensures a user can only read/write their own rows.
 */
import { createClient } from "@/src/app/lib/supabase/client";

const PROFILE_IMAGE_BUCKET = "profile-images";
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface MyProfile {
  id: string;
  role: "athlete" | "supporter";
  firstName: string;
  lastName: string;
  bio: string;
  profilePicture: string;
  // Athlete-only (empty/zero for supporters):
  sport: string;
  /** Canonical region code (e.g. "NCR", "Region XI"); "" if unset. */
  regionCode: string;
  /** Display location label (region name). */
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
  let regionCode = "";
  let location = "";
  let fundingGoal: number | null = null;
  if (prof.role === "athlete") {
    const { data: ap } = await supabase
      .from("athlete_profiles")
      .select("sport, region_code, location, funding_goal")
      .eq("user_id", uid)
      .maybeSingle();
    sport = ap?.sport ?? "";
    regionCode = ap?.region_code ?? "";
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
    regionCode,
    location,
    fundingGoal,
  };
}

/** Upload and publish the signed-in user's profile picture. */
export async function uploadMyProfilePicture(file: File): Promise<string> {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error("Profile pictures must be 5 MB or smaller.");
  }

  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  const uid = auth.user?.id;
  if (!uid) throw new Error("You must be signed in.");

  const path = `${uid}/profile`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "0",
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path);
  const { data: updatedProfile, error: profileError } = await supabase
    .from("profiles")
    .update({ profile_picture: data.publicUrl })
    .eq("id", uid)
    .select("id")
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!updatedProfile) throw new Error("The image uploaded, but your profile picture could not be saved.");
  return data.publicUrl;
}

export interface UpdateMyProfileInput {
  firstName: string;
  lastName?: string;
  bio: string;
  // Athlete-only:
  sport?: string;
  /** Canonical region code chosen from the dropdown. */
  regionCode?: string;
  /** Display location label (region name), derived from regionCode. */
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

  const { data: auth2 } = await supabase.auth.getUser();
  const metaRole = (auth2.user?.user_metadata?.role as "athlete" | "supporter" | undefined) ?? undefined;

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
  const role = (prof?.role as "athlete" | "supporter" | undefined) ?? metaRole ?? "supporter";

  // Upsert by primary key (id). This updates the existing row or creates the
  // one-and-only row if it is somehow missing — it can never create a duplicate
  // (id is the PK). Role is only set when the row doesn't exist yet; an existing
  // role is preserved by passing the value we already read.
  const { error: pErr } = await supabase
    .from("profiles")
    .upsert(
      {
        id: uid,
        role,
        first_name: input.firstName.trim() || null,
        last_name: input.lastName?.trim() || null,
        bio: input.bio.trim() || null,
      },
      { onConflict: "id" },
    );
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
          region_code: input.regionCode?.trim() || null,
          location: input.location?.trim() || null,
          funding_goal: input.fundingGoal ?? null,
        },
        { onConflict: "user_id" },
      );
    if (aErr) throw new Error(aErr.message);
  }
}
