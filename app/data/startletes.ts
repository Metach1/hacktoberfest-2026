import seedData from "@/data/athletes.json";

export type Athlete = {
  id: string;
  name: string;
  sport: string;
  location: string;
  age: number;
  heightCm: number;
  region: string;
  price: number;
  fundingGoal: number;
  progress: number;
  image: string;
  votes: number;
  ranking: number;
};

export const sports = [
  "All Sports",
  "Basketball",
  "Boxing",
  "Volleyball",
  "Weightlifting",
] as const;

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export const athletes: Athlete[] = seedData.athletes.map((profile) => ({
  id: profile.id,
  name: profile.name,
  sport: profile.sport,
  location: profile.provinceOrLocality,
  age: profile.age,
  heightCm: profile.heightCm,
  region: profile.region,
  price: profile.fundingRaised,
  fundingGoal: profile.fundingGoal,
  progress: profile.fundingProgress,
  image: "/athlete-placeholder.svg",
  votes: profile.votes,
  ranking: profile.ranking,
}));

const leaderboardAccents = ["#f4b334", "#dd7a36", "#8a5be2", "#d7dce3"];

export const leaderboardRows = [...athletes]
  .sort((first, second) => first.ranking - second.ranking)
  .slice(0, 4)
  .map((athlete, index) => ({
    rank: athlete.ranking,
    name: athlete.name,
    sport: athlete.sport,
    votes: athlete.votes.toLocaleString("en-PH"),
    funding: currencyFormatter.format(athlete.price),
    accent: leaderboardAccents[index],
  }));

export const profileStats = {
  totalFunded: 120000,
  backers: 842,
  ranking: 12,
};

export const activityItems = [
  { title: "Received funding from 12 new backers", time: "2 hours ago", color: "#3d8af7" },
  { title: "Moved up 3 spots in the ranking", time: "Yesterday", color: "#1eb97a" },
  { title: "Profile verification approved", time: "3 days ago", color: "#d7dce3" },
];
