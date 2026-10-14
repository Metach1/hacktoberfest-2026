import { activityItems, profileStats } from "../model/profile";

export function ProfileScreen() {
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
              <span className="font-bold text-slate-800">₱{profileStats.totalFunded.toLocaleString("en-PH")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Backers</span>
              <span className="font-bold text-slate-800">{profileStats.backers.toLocaleString("en-PH")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Ranking</span>
              <span className="font-bold text-slate-800">#{profileStats.ranking}</span>
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