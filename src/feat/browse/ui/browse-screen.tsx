import { athletes, sports } from "../model/browse";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BrowseScreen() {
  return (
    <>
      <h1 className="mt-7 text-[3rem] font-extrabold tracking-[-0.06em] text-slate-800">Browse Athletes</h1>
      <p className="mt-2 text-[1.1rem] text-slate-500">Find your next favorite local champion.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {sports.map((sport, index) => (
          <button key={sport} type="button" className={`rounded-full border px-4 py-2 text-[0.96rem] font-medium transition ${index === 0 ? "border-[#2d9cdb] bg-[#2d9cdb] text-white shadow-sm" : "border-[#dfe4ea] bg-white text-slate-600 hover:bg-slate-50"}`}>
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