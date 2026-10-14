import { athletes } from "@/app/data/startletes";
import Image from "next/image";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function MapMarker({
  label,
  color,
  left,
  top,
}: {
  label: string;
  color: string;
  left: string;
  top: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Athletes in ${label}`}
      className="absolute z-10 -translate-x-1/2 -translate-y-full"
      style={{ left, top }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full shadow-md" style={{ backgroundColor: color }}>
        <PinIcon />
      </span>
      <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#e5e7eb] bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
        {label}
      </span>
    </button>
  );
}

function MetricCard({ title, value, trend }: { title: string; value: string; trend: string }) {
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
      <div className="mt-3 text-sm font-medium text-emerald-600">{trend}</div>
    </div>
  );
}

export function HomeDashboard() {
  return (
    <>
      <h1 className="mt-7 text-[3rem] font-extrabold tracking-[-0.06em] text-slate-800">Discover Athletes</h1>
      <p className="mt-2 text-[1.1rem] text-slate-500">Explore local talent across the Philippines.</p>

      <div className="mt-7 rounded-[26px] border border-[#dfe4ea] bg-[#e7eaec] p-4">
        <div className="relative overflow-hidden rounded-[24px] border border-[#dfe4ea] bg-[#e8e9eb] p-4 shadow-inner">
          <div className="relative h-[420px] overflow-hidden rounded-[18px] bg-[#f6f6f4]">
            <div className="absolute left-1/2 top-1/2 aspect-[300/470] w-[min(100%,268px)] -translate-x-1/2 -translate-y-1/2">
              <Image
                src="/philippines-map.svg"
                alt="Map of the Philippines"
                fill
                sizes="268px"
                className="object-contain"
                priority
              />
              <MapMarker label="Metro Manila" color="#f53d49" left="40.8%" top="40.8%" />
              <MapMarker label="Cebu" color="#3d8af7" left="67.1%" top="65.9%" />
              <MapMarker label="Davao" color="#3d8af7" left="82.8%" top="84.2%" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <MetricCard title="Total Athletes" value="1,240" trend="+12% this month" />
        <MetricCard title="Funded Today" value="₱45k" trend="+5% vs yesterday" />
        <MetricCard title="Active Campaigns" value="84" trend="+2% this week" />
      </div>
    </>
  );
}

export function BrowseAthletes() {
  return (
    <>
      <h1 className="mt-7 text-[3rem] font-extrabold tracking-[-0.06em] text-slate-800">Browse Athletes</h1>
      <p className="mt-2 text-[1.1rem] text-slate-500">Find your next favorite local champion.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {['All Sports', 'Basketball', 'Boxing', 'Volleyball', 'Weightlifting'].map((sport, index) => (
          <button key={sport} type="button" className={`rounded-full border px-4 py-2 text-[0.96rem] font-medium transition ${index === 0 ? 'border-[#2d9cdb] bg-[#2d9cdb] text-white shadow-sm' : 'border-[#dfe4ea] bg-white text-slate-600 hover:bg-slate-50'}`}>
            {sport}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        {athletes.slice(0, 3).map((athlete) => (
          <div key={athlete.id} className="overflow-hidden rounded-[22px] border border-[#dfe4ea] bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]">
            <div className="h-[210px] w-full bg-cover bg-center" style={{ backgroundImage: `url(${athlete.image})` }} />
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
                <div className="text-xl font-extrabold tracking-[-0.04em] text-slate-800">{formatCurrency(athlete.price)}</div>
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

export function LeaderboardPanel() {
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

        {[
          { rank: 1, name: 'EJ Obiena', sport: 'Pole Vault', votes: '12,450', funding: '₱85,000', accent: '#f4b334' },
          { rank: 2, name: 'Alyssa Valdez', sport: 'Volleyball', votes: '9,200', funding: '₱60,000', accent: '#dd7a36' },
          { rank: 3, name: 'Jordan Clarkson', sport: 'Basketball', votes: '8,100', funding: '₱45,000', accent: '#8a5be2' },
          { rank: 4, name: 'Hidilyn Diaz', sport: 'Weightlifting', votes: '7,500', funding: '₱40,000', accent: '#d7dce3' },
        ].map((row) => (
          <div key={row.name} className="grid grid-cols-[90px_1.3fr_1fr_1fr_1fr] items-center gap-4 border-b border-[#eaf0f5] px-6 py-5 last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm" style={{ backgroundColor: row.accent }}>
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

export function ProfileSummary() {
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
            {[
              { title: 'Received funding from 12 new backers', time: '2 hours ago', color: '#3d8af7' },
              { title: 'Moved up 3 spots in the ranking', time: 'Yesterday', color: '#1eb97a' },
              { title: 'Profile verification approved', time: '3 days ago', color: '#d7dce3' },
            ].map((item) => (
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
