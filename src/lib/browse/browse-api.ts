import { athletes, sports } from "@/app/data/startletes";
import type { Athlete } from "@/app/data/startletes";

export type { Athlete };
export type Sport = (typeof sports)[number];

export function getAthletes(sport?: string): Athlete[] {
  if (!sport || sport === "All Sports") {
    return [...athletes];
  }

  return athletes.filter((athlete) => athlete.sport === sport);
}

export function getAthleteById(id: string): Athlete | undefined {
  return athletes.find((athlete) => athlete.id === id);
}

export function getSports(): readonly Sport[] {
  return sports;
}