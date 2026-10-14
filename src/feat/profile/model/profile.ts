import { getProfileOverview } from "@/src/lib/profile/profile-api";

const profileOverview = getProfileOverview();

export const profileStats = profileOverview.stats;
export const activityItems = profileOverview.activity;