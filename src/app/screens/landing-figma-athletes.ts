/**
 * Landing-page spotlight data, reproduced from the original Figma Make design
 * so the home page matches that mock exactly (names, sports, locations, bios,
 * achievements, funding numbers, and imagery).
 *
 * This data drives only the landing page's spotlight and regional sections. The
 * rest of the Starlete app (Discover, profiles, dashboard, donation) continues
 * to use the real fictional seed via the store. "View story" links point at
 * /discover because these specific mock athletes are not Starlete profile routes.
 *
 * All profiles are fictional demo content.
 */
export interface FigmaAthlete {
  id: number;
  name: string;
  sport: string;
  location: string;
  region: string;
  image: string;
  raised: number;
  goal: number;
  supporters: number;
  verified: boolean;
  bio: string;
  achievement: string;
}

const photos = {
  runner: "https://images.unsplash.com/photo-1786333889785-f8311fc3f487?auto=format&fit=crop&w=900&q=85",
  boxer: "https://images.unsplash.com/photo-1762744828343-42b6d865dd8e?auto=format&fit=crop&w=900&q=85",
  basketball: "https://images.unsplash.com/photo-1580442256395-d9c32a65fbf6?auto=format&fit=crop&w=900&q=85",
  swimmer: "https://images.unsplash.com/photo-1772203031513-4a20f7478ad9?auto=format&fit=crop&w=900&q=85",
  track: "https://images.unsplash.com/photo-1728532483490-708f6562b738?auto=format&fit=crop&w=900&q=85",
};

/** The five Figma mock athletes, in the original order. */
export const figmaAthletes: FigmaAthlete[] = [
  { id: 1, name: "Mikaela Reyes", sport: "Track & Field", location: "Cebu City", region: "Central Visayas", image: photos.runner, raised: 78500, goal: 120000, supporters: 143, verified: true, bio: "A national 400m hopeful training to represent the Philippines on the Southeast Asian stage. Every contribution supports coaching, travel, and competition fees.", achievement: "2024 PATAFA National Open — Silver Medal" },
  { id: 2, name: "Paolo Santos", sport: "Boxing", location: "Baguio City", region: "Cordillera", image: photos.boxer, raised: 112000, goal: 150000, supporters: 208, verified: true, bio: "A disciplined flyweight boxer from Baguio with his sights set on the national team. Paolo trains twice daily while mentoring young boxers in his barangay.", achievement: "Cordillera Regional Champion, 3×" },
  { id: 3, name: "Enzo Villanueva", sport: "Basketball", location: "Quezon City", region: "Metro Manila", image: photos.basketball, raised: 45600, goal: 100000, supporters: 86, verified: true, bio: "A quick, creative point guard earning a place in elite development camps. Funding will cover travel, gear, and strength training.", achievement: "UAAP Juniors Mythical Five" },
  { id: 4, name: "Althea Cruz", sport: "Swimming", location: "Davao City", region: "Davao Region", image: photos.swimmer, raised: 62900, goal: 90000, supporters: 119, verified: true, bio: "An open-water specialist building toward her first international meet. Althea is proud to carry Davao's colors wherever she races.", achievement: "National Youth Games — Gold Medal" },
  { id: 5, name: "Rafael Lim", sport: "Track & Field", location: "Iloilo City", region: "Western Visayas", image: photos.track, raised: 33100, goal: 80000, supporters: 64, verified: false, bio: "A middle-distance runner balancing university and a demanding training schedule.", achievement: "Western Visayas 800m Record Holder" },
];

/** Region labels shown on the regional story cards, matching the Figma design. */
export const athleteRegions: Record<string, string> = {
  "Cebu City": "Central Visayas",
  "Baguio City": "Cordillera",
  "Quezon City": "Metro Manila",
  "Davao City": "Davao Region",
  "Iloilo City": "Western Visayas",
};

/** The team-training image used by the breakthrough section. */
export const teamTrainingPhoto =
  "https://images.unsplash.com/photo-1659367527460-92759bf33263?auto=format&fit=crop&w=1400&q=85";
