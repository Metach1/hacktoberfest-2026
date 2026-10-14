import { athletes } from "@/app/data/startletes";

export type LeaderboardRow = {
  rank: number;
  name: string;
  sport: string;
  votes: string;
  funding: string;
  accent: string;
};

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const leaderboardAccents = ["#f4b334", "#dd7a36", "#8a5be2", "#d7dce3"];

export function getLeaderboardRows(limit = 4): LeaderboardRow[] {
  return [...athletes]
    .sort((first, second) => first.ranking - second.ranking)
    .slice(0, limit)
    .map((athlete, index) => ({
      rank: athlete.ranking,
      name: athlete.name,
      sport: athlete.sport,
      votes: athlete.votes.toLocaleString("en-PH"),
      funding: currencyFormatter.format(athlete.price),
      accent: leaderboardAccents[index % leaderboardAccents.length],
    }));
}