import { getAthletes, getSports } from "@/src/lib/browse/browse-api";

export const athletes = getAthletes();
export const sports = getSports();
export type { Athlete, Sport } from "@/src/lib/browse/browse-api";