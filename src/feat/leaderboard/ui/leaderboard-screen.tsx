import { leaderboardRows } from "../model/leaderboard";

export function LeaderboardScreen() {
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