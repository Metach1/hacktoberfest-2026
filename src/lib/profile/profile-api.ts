export type ActivityItem = {
  title: string;
  time: string;
  color: string;
};

export type ProfileOverview = {
  stats: {
    totalFunded: number;
    backers: number;
    ranking: number;
  };
  activity: ActivityItem[];
};

const profileOverview: ProfileOverview = {
  stats: {
    totalFunded: 120000,
    backers: 842,
    ranking: 12,
  },
  activity: [
    { title: "Received funding from 12 new backers", time: "2 hours ago", color: "#3d8af7" },
    { title: "Moved up 3 spots in the ranking", time: "Yesterday", color: "#1eb97a" },
    { title: "Profile verification approved", time: "3 days ago", color: "#d7dce3" },
  ],
};

export function getProfileOverview(): ProfileOverview {
  return {
    stats: { ...profileOverview.stats },
    activity: profileOverview.activity.map((item) => ({ ...item })),
  };
}