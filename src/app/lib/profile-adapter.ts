import type { Athlete } from "@/src/app/data/athletes";
import type { PublicAthleteProfile } from "@/src/app/services/profile";
import { regionName } from "@/src/app/lib/regions";

/** Adapt a registered profile to the existing athlete-card and profile UI shape. */
export function toAthlete(profile: PublicAthleteProfile, localId: number): Athlete {
  return {
    id: localId,
    profileId: profile.id,
    name: profile.name,
    sport: profile.sport,
    location: profile.location,
    regionCode: profile.regionCode,
    region: regionName(profile.regionCode) ?? profile.location,
    province: profile.province,
    city: profile.city,
    image: profile.image,
    raised: 0,
    goal: profile.fundingGoal ?? 0,
    supporters: 0,
    verified: profile.verified,
    bio: profile.bio,
    achievement: profile.achievement,
  };
}
