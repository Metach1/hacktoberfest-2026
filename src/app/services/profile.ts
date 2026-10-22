"use client";

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
  sport: string;
  regionCode: string;
  location: string;
  achievement: string;
  fundingGoal: number | null;
  verified: boolean;
}

export interface PublicAthleteProfile {
  id: string;
  name: string;
  sport: string;
  location: string;
  regionCode: string;
  image: string;
  bio: string;
  achievement: string;
  fundingGoal: number | null;
  verified: boolean;
}

interface ProfileRow {
  id: string;
  role: "athlete" | "supporter";
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

/** Load the signed-in user's profile and athlete-specific fields, if applicable. */
export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, profile_picture, bio")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profileData) return null;

  const profile = profileData as ProfileRow;
  let athleteProfile: AthleteProfileRow | null = null;
  if (profile.role === "athlete") {
    const { data, error } = await supabase
      .from("athlete_profiles")
      .select("user_id, sport, region_code, location, bio, achievement, funding_goal, verified")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    athleteProfile = data as AthleteProfileRow | null;
  }

  return {
    id: profile.id,
    role: profile.role,
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    bio: profile.bio ?? "",
    profilePicture: profile.profile_picture ?? "",
    sport: athleteProfile?.sport ?? "",
    regionCode: athleteProfile?.region_code ?? "",
    location: athleteProfile?.location ?? "",
    achievement: athleteProfile?.achievement ?? "",
    fundingGoal: athleteProfile?.funding_goal ?? null,
    verified: athleteProfile?.verified ?? false,
  };
}

/** Load registered athlete profile fields for the public discovery/profile screens. */
export async function getPublicAthleteProfiles(userId?: string): Promise<PublicAthleteProfile[]> {
  const supabase = createClient();
  let query = supabase
    .from("profiles")
    .select("id, role, first_name, last_name, profile_picture, bio")
    .eq("role", "athlete")
    .order("created_at", { ascending: false });
  if (userId) query = query.eq("id", userId);
  const { data: profileData, error: profileError } = await query;
  if (profileError) throw new Error(profileError.message);

  const profiles = (profileData ?? []) as ProfileRow[];
  if (!profiles.length) return [];

  const userIds = profiles.map((profile) => profile.id);
  const { data: athleteData, error: athleteError } = await supabase
    .from("athlete_profiles")
    .select("user_id, sport, region_code, location, bio, achievement, funding_goal, verified")
    .in("user_id", userIds);
  if (athleteError) throw new Error(athleteError.message);

  const athleteProfiles = (athleteData ?? []) as AthleteProfileRow[];
  const athleteById = new Map(athleteProfiles.map((profile) => [profile.user_id, profile]));

  return profiles.map((profile) => {
    const athlete = athleteById.get(profile.id);
    return {
      id: profile.id,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Athlete",
      sport: athlete?.sport ?? "",
      location: athlete?.location ?? "",
      regionCode: athlete?.region_code ?? "",
      image: profile.profile_picture ?? "/athlete-placeholder.svg",
      bio: athlete?.bio ?? profile.bio ?? "",
      achievement: athlete?.achievement ?? "",
      fundingGoal: athlete?.funding_goal ?? null,
      verified: athlete?.verified ?? false,
    };
  });
}

/** Load one publicly readable athlete profile by Supabase user ID. */
export async function getPublicAthleteProfile(userId: string): Promise<PublicAthleteProfile | null> {
  const profiles = await getPublicAthleteProfiles(userId);
  return profiles[0] ?? null;
}

export interface UpdateMyProfileInput {
  firstName: string;
  lastName: string;
  bio: string;
  sport?: string;
  regionCode?: string;
  location?: string;
  achievement?: string;
  fundingGoal?: number | null;
}

/** Update profile fields without changing the account's role. */
export async function updateMyProfile(input: UpdateMyProfileInput): Promise<void> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  const userId = auth.user?.id;
  if (!userId) throw new Error("You must be signed in.");

  const { data: currentProfile, error: readError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!currentProfile) throw new Error("Your profile could not be found.");
  const role = (currentProfile as { role: "athlete" | "supporter" }).role;

  if (role === "athlete" && input.fundingGoal != null &&
    !(Number.isFinite(input.fundingGoal) && input.fundingGoal > 0)) {
    throw new Error("Funding goal must be greater than zero.");
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName.trim() || null,
      last_name: input.lastName.trim() || null,
      bio: input.bio.trim() || null,
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updatedProfile) throw new Error("Your profile changes could not be saved.");

  if (role === "athlete") {
    const { error } = await supabase
      .from("athlete_profiles")
      .upsert({
        user_id: userId,
        sport: input.sport?.trim() || null,
        region_code: input.regionCode?.trim() || null,
        location: input.location?.trim() || null,
        bio: input.bio.trim() || null,
        achievement: input.achievement?.trim() || null,
        funding_goal: input.fundingGoal ?? null,
      }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  }
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
  const userId = auth.user?.id;
  if (!userId) throw new Error("You must be signed in.");

  const path = `${userId}/profile`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "0",
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path);
  const { data: updatedProfile, error: updateError } = await supabase
    .from("profiles")
    .update({ profile_picture: data.publicUrl })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updatedProfile) throw new Error("The image uploaded, but your profile picture could not be saved.");
  return data.publicUrl;
}
