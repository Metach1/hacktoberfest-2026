import Image from "next/image";

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

