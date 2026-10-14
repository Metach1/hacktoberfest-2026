"use client";

import { useState } from "react";

type NavKey = "home" | "browse" | "ranking" | "profile";

const navItems: Array<{ key: NavKey; label: string; icon: string }> = [
  { key: "home", label: "Home", icon: "home" },
  { key: "browse", label: "Browse", icon: "browse" },
  { key: "ranking", label: "Ranking", icon: "ranking" },
  { key: "profile", label: "Profile", icon: "profile" },
];

const sports = ["All Sports", "Basketball", "Boxing", "Volleyball", "Weightlifting"];

const athleteCards = [
  {
    name: "EJ Obiena",
    sport: "Pole Vault",
    price: "₱12,500",
    progress: 35,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Alyssa Valdez",
    sport: "Volleyball",
    price: "₱8,200",
    progress: 50,
    image:
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Jordan Clarkson",
    sport: "Basketball",
    price: "₱45,000",
    progress: 90,
    image:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
  },
];

const leaderboardRows = [
  { rank: 1, name: "EJ Obiena", sport: "Pole Vault", votes: "12,450", funding: "₱85,000", accent: "#f4b334" },
  { rank: 2, name: "Alyssa Valdez", sport: "Volleyball", votes: "9,200", funding: "₱60,000", accent: "#dd7a36" },
  { rank: 3, name: "Jordan Clarkson", sport: "Basketball", votes: "8,100", funding: "₱45,000", accent: "#8a5be2" },
  { rank: 4, name: "Hidilyn Diaz", sport: "Weightlifting", votes: "7,500", funding: "₱40,000", accent: "#d7dce3" },
];

const activityItems = [
  { title: "Received funding from 12 new backers", time: "2 hours ago", color: "#3d8af7" },
  { title: "Moved up 3 spots in the ranking", time: "Yesterday", color: "#1eb97a" },
  { title: "Profile verification approved", time: "3 days ago", color: "#d7dce3" },
];

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
      <path d="M12 2.5 14.9 8l6 .9-4.4 4.2 1 6-5.5-3-5.5 3 1-6L3 8.9l6-.9L12 2.5Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="5.5" />
      <path d="M16 16l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M7 10a5 5 0 1 1 10 0v3.5l1.6 2.5H5.4L7 13.5V10Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-7H9v7H5a1 1 0 0 1-1-1v-8.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrowseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="5.5" />
      <path d="M16 16l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function RankingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M7 15.5V7m5 8.5V4m5 11.5v-6" strokeLinecap="round" />
      <path d="M4 19.5h16" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 18.5c1.8-2.6 4.1-4 7-4s5.2 1.4 7 4" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon({ color = "#f43f5e" }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill={color} />
      <circle cx="12" cy="10" r="3" fill="white" />
    </svg>
  );
}

function MapPanel() {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#dfe4ea] bg-[#e8e9eb] p-4 shadow-inner">
      <div className="relative h-[420px] overflow-hidden rounded-[18px] bg-[#f6f6f4]">
        <svg viewBox="0 0 760 420" className="h-full w-full" aria-label="Philippines map illustration">
          <path
            d="M246 103l21-16 43 12 24-15 20 7 16-14 13 7 21 12 17-7 18 13 8 13 20 11 10 20 14 6 8 17-12 20-17 6-22 22-18 2-18-6-16 9-15 12-16-7-13 5-21-7-38 15-22-13-14-31-9-20 10-19 13-19 14-7 11-17 14-7Z"
            fill="#f3f1ef"
            stroke="#1f2a37"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <g fontSize="10" fill="#2a3341" fontFamily="Arial, sans-serif" fontWeight="600">
            <text x="278" y="130">MANILA</text>
            <text x="395" y="228">CEBU</text>
            <text x="245" y="187">PALAWAN</text>
            <text x="216" y="98">BASILAN</text>
          </g>
        </svg>

        <div className="absolute left-[28%] top-[24%] flex items-center gap-3 rounded-full border border-[#dfe4ea] bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f53d49] text-white shadow-sm">
            <PinIcon color="#f53d49" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Metro Manila</span>
        </div>

        <div className="absolute right-[11%] top-[18%] flex items-center gap-3 rounded-full border border-[#dfe4ea] bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm">
          <span className="text-sm font-semibold text-slate-700">Davao</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3d8af7] text-white shadow-sm">
            <PinIcon color="#3d8af7" />
          </div>
        </div>

        <div className="absolute right-[28%] top-[54%] flex items-center gap-3 rounded-full border border-[#dfe4ea] bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm">
          <span className="text-sm font-semibold text-slate-700">Cebu</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3d8af7] text-white shadow-sm">
            <PinIcon color="#3d8af7" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, positive = true }: { title: string; value: string; trend: string; positive?: boolean }) {
  return (
    <div className="rounded-[18px] border border-[#dfe4ea] bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-slate-700">{title}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
            <path d="M4 18h16" strokeLinecap="round" />
            <path d="M7 15V9m5 6V5m5 10v-7" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-slate-800">{value}</div>
      <div className={`mt-3 text-sm font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}>
        {trend}
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <>
      <h1 className="mt-7 text-[3rem] font-extrabold tracking-[-0.06em] text-slate-800">Discover Athletes</h1>
      <p className="mt-2 text-[1.1rem] text-slate-500">Explore local talent across the Philippines.</p>

      <div className="mt-7 rounded-[26px] border border-[#dfe4ea] bg-[#e7eaec] p-4">
        <MapPanel />
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <MetricCard title="Total Athletes" value="1,240" trend="+12% this month" />
        <MetricCard title="Funded Today" value="₱45k" trend="+5% vs yesterday" />
        <MetricCard title="Active Campaigns" value="84" trend="+2% this week" />
      </div>
    </>
  );
}

function BrowsePage() {
  return (
    <>
      <h1 className="mt-7 text-[3rem] font-extrabold tracking-[-0.06em] text-slate-800">Browse Athletes</h1>
      <p className="mt-2 text-[1.1rem] text-slate-500">Find your next favorite local champion.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {sports.map((sport, index) => (
          <button
            key={sport}
            type="button"
            className={`rounded-full border px-4 py-2 text-[0.96rem] font-medium transition ${
              index === 0
                ? "border-[#2d9cdb] bg-[#2d9cdb] text-white shadow-sm"
                : "border-[#dfe4ea] bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {sport}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        {athleteCards.map((athlete) => (
          <div key={athlete.name} className="overflow-hidden rounded-[22px] border border-[#dfe4ea] bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]">
            <div
              className="h-[210px] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${athlete.image})` }}
            />
            <div className="px-4 pb-4 pt-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[1.05rem] font-extrabold text-slate-800">{athlete.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                      <path d="M12 21s6.5-5.2 8.6-9.2A6.7 6.7 0 1 0 5.4 11.8C7.5 15.8 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {athlete.sport}
                  </div>
                </div>
                <div className="text-xl font-extrabold tracking-[-0.04em] text-slate-800">{athlete.price}</div>
              </div>

              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#edf2f6]">
                <div className="h-full rounded-full bg-[#2d9cdb]" style={{ width: `${athlete.progress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RankingPage() {
  return (
    <>
      <h1 className="mt-7 text-[3rem] font-extrabold tracking-[-0.06em] text-slate-800">Leaderboard</h1>
      <p className="mt-2 text-[1.1rem] text-slate-500">Top-funded athletes this month.</p>

      <div className="mt-8 overflow-hidden rounded-[24px] border border-[#dfe4ea] bg-white">
        <div className="grid grid-cols-[90px_1.3fr_1fr_1fr_1fr] items-center gap-4 border-b border-[#dfe4ea] bg-white px-6 py-4 text-sm font-semibold text-slate-500">
          <span>Rank</span>
          <span>Athlete</span>
          <span>Sport</span>
          <span>Votes</span>
          <span>Funding</span>
        </div>

        {leaderboardRows.map((row) => (
          <div key={row.name} className="grid grid-cols-[90px_1.3fr_1fr_1fr_1fr] items-center gap-4 border-b border-[#eaf0f5] px-6 py-5 last:border-b-0">
            <div className="flex items-center gap-3">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: row.accent }}
              >
                {row.rank}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-[radial-gradient(circle_at_30%_30%,#f4d0c2,#8b5c4d)]" />
              <div>
                <div className="text-lg font-extrabold text-slate-800">{row.name}</div>
                <div className="text-sm text-slate-500">{row.sport}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                <path d="M12 21s6.5-5.2 8.6-9.2A6.7 6.7 0 1 0 5.4 11.8C7.5 15.8 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {row.sport}
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="#2d9cdb" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                <path d="M12 19.7V4.3" strokeLinecap="round" />
                <path d="M7.7 9.6 12 4.3l4.3 5.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-bold">{row.votes}</span>
            </div>

            <div className="flex items-center gap-2 font-bold text-slate-800">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1eb97a" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                <path d="M5 9.5a7 7 0 0 1 14 0v5.5H5V9.5Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.5 15.5h5" strokeLinecap="round" />
              </svg>
              {row.funding}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ProfilePage() {
  return (
    <>
      <h1 className="mt-7 text-[3rem] font-extrabold tracking-[-0.06em] text-slate-800">My Profile</h1>
      <p className="mt-2 text-[1.1rem] text-slate-500">Manage your athlete profile and funding.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[22px] border border-[#dfe4ea] bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[radial-gradient(circle_at_30%_25%,#f5d8c6,#6b5038_58%,#2c3748_100%)]" />
            <div>
              <div className="text-[2rem] font-extrabold tracking-[-0.05em] text-slate-800">Juan Dela Cruz</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Verified Athlete
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4 text-lg text-slate-600">
            <div className="flex items-center justify-between">
              <span>Total Funded</span>
              <span className="font-bold text-slate-800">₱120,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Backers</span>
              <span className="font-bold text-slate-800">842</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Ranking</span>
              <span className="font-bold text-slate-800">#12</span>
            </div>
          </div>

          <button type="button" className="mt-8 w-full rounded-[14px] bg-[#2d9cdb] py-3 text-center text-base font-bold text-white shadow-sm transition hover:bg-[#1f88d6]">
            Edit Profile
          </button>
        </div>

        <div className="rounded-[22px] border border-[#dfe4ea] bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
          <h2 className="text-[2rem] font-extrabold tracking-[-0.05em] text-slate-800">Recent Activity</h2>
          <div className="mt-7 space-y-6">
            {activityItems.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe4ea] bg-[#f4f7fb] text-white" style={{ color: item.color }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                    <path d="M8 12.5h8M8 9.5h5M7 5.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div className="text-[1.05rem] font-semibold text-slate-700">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<NavKey>("home");

  const renderView = () => {
    switch (activeView) {
      case "browse":
        return <BrowsePage />;
      case "ranking":
        return <RankingPage />;
      case "profile":
        return <ProfilePage />;
      case "home":
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#eef1f4] px-4 py-6 md:px-10">
      <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[26px] border border-[#dfe4ea] bg-[#f5f7f9] pb-3 shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
        <header className="flex items-center justify-between border-b border-[#dfe4ea] bg-[#f5f7f9] px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-[#dfe4ea]">
              <StarIcon />
            </div>
            <div className="text-[2.05rem] font-extrabold tracking-[-0.06em] text-slate-800">Startletes</div>
          </div>

          <div className="flex items-center gap-4">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe4ea] bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="Search">
              <SearchIcon />
            </button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe4ea] bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="Notifications">
              <BellIcon />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1d2735] text-sm font-bold text-white shadow-sm">JD</div>
          </div>
        </header>

        <main className="px-7 pb-1 pt-2">{renderView()}</main>

        <nav className="mt-8 grid grid-cols-4 border-t border-[#dfe4ea] bg-white/90">
          {navItems.map((item) => {
            const active = activeView === item.key;
            const Icon =
              item.icon === "home"
                ? HomeIcon
                : item.icon === "browse"
                  ? BrowseIcon
                  : item.icon === "ranking"
                    ? RankingIcon
                    : ProfileIcon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveView(item.key)}
                className={`flex flex-col items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition ${
                  active ? "text-[#2d9cdb]" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
