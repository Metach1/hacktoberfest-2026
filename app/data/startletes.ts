export type Athlete = {
  id: string;
  name: string;
  sport: string;
  location: string;
  price: number;
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

export const athletes: Athlete[] = [
  {
    id: "ej-obiena",
    name: "EJ Obiena",
    sport: "Pole Vault",
    location: "Metro Manila",
    price: 12500,
    progress: 35,
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    votes: 12450,
    ranking: 1,
  },
  {
    id: "alyssa-valdez",
    name: "Alyssa Valdez",
    sport: "Volleyball",
    location: "Davao",
    price: 8200,
    progress: 50,
    image: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80",
    votes: 9200,
    ranking: 2,
  },
  {
    id: "jordan-clarkson",
    name: "Jordan Clarkson",
    sport: "Basketball",
    location: "Cebu",
    price: 45000,
    progress: 90,
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
    votes: 8100,
    ranking: 3,
  },
  {
    id: "hidilyn-diaz",
    name: "Hidilyn Diaz",
    sport: "Weightlifting",
    location: "Metro Manila",
    price: 40000,
    progress: 67,
    image: "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=900&q=80",
    votes: 7500,
    ranking: 4,
  },
  {
    id: "manny-pacquiao",
    name: "Manny Pacquiao",
    sport: "Boxing",
    location: "General Santos",
    price: 28000,
    progress: 74,
    image: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=80",
    votes: 6400,
    ranking: 5,
  },
];

export const leaderboardRows = [
  { rank: 1, name: "EJ Obiena", sport: "Pole Vault", votes: "12,450", funding: "₱85,000", accent: "#f4b334" },
  { rank: 2, name: "Alyssa Valdez", sport: "Volleyball", votes: "9,200", funding: "₱60,000", accent: "#dd7a36" },
  { rank: 3, name: "Jordan Clarkson", sport: "Basketball", votes: "8,100", funding: "₱45,000", accent: "#8a5be2" },
  { rank: 4, name: "Hidilyn Diaz", sport: "Weightlifting", votes: "7,500", funding: "₱40,000", accent: "#d7dce3" },
];

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
