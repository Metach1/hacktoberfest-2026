"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AthleteCard, Icon } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";
import type { Athlete } from "@/src/app/data/athletes";
import { regionName } from "@/src/app/lib/regions";
import {
  REGION_MAP,
  countByRegion,
  filterAthletes,
} from "@/src/app/lib/region-map";

function PhilippinesMap({ athletes, selectedRegion, onSelectRegion }: { athletes: Athlete[]; selectedRegion: string | null; onSelectRegion: (regionCode: string | null) => void }) {
  const counts = useMemo(() => countByRegion(athletes), [athletes]);

  const handleSelect = (regionCode: string, count: number) => {
    if (count === 0) return; // empty regions (incl. NIR) are not selectable
    onSelectRegion(selectedRegion === regionCode ? null : regionCode);
  };

  return (
    <div className="ph-map" role="group" aria-label="Interactive map of the Philippines. Select a region to see its athletes.">
      <svg className="ph-map-svg" viewBox={REGION_MAP.viewBox} aria-label="Philippine administrative regions">
        {REGION_MAP.regions.map(region => {
          const count = counts[region.regionCode] ?? 0;
          const populated = count > 0;
          const selected = selectedRegion === region.regionCode;
          const label = populated
            ? `${region.name}: ${count} athlete${count === 1 ? "" : "s"}`
            : `${region.name}: no athletes yet`;
          const cls = ["ph-region", populated ? "populated" : "empty", selected ? "selected" : ""].filter(Boolean).join(" ");
          return (
            <path
              key={region.regionCode}
              d={region.svgPath}
              className={cls}
              role={populated ? "button" : "img"}
              tabIndex={populated ? 0 : undefined}
              aria-label={label}
              aria-disabled={populated ? undefined : true}
              aria-pressed={populated ? selected : undefined}
              onClick={() => handleSelect(region.regionCode, count)}
              onKeyDown={e => {
                if (populated && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleSelect(region.regionCode, count);
                }
              }}
            >
              <title>{label}</title>
            </path>
          );
        })}
      </svg>
      <div className="ph-map-legend" aria-hidden="true">
        <span className="legend-item"><span className="legend-swatch populated" /> Has athletes</span>
        <span className="legend-item"><span className="legend-swatch selected" /> Selected</span>
        <span className="legend-item"><span className="legend-swatch empty" /> No athletes yet</span>
      </div>
    </div>
  );
}

export function DiscoverScreen() {
  const { athletes } = useStarlete();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("All sports");

  // The selected region is held in the URL so it is shareable and works with
  // the browser back button. A valid region code is one that exists on the map.
  const regionParam = searchParams.get("region");
  const selectedRegion = regionParam && REGION_MAP.regions.some(r => r.regionCode === regionParam)
    ? regionParam
    : null;

  const setSelectedRegion = useCallback((regionCode: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (regionCode) params.set("region", regionCode);
    else params.delete("region");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const filtered = useMemo(
    () => filterAthletes(athletes, { search, sport, region: selectedRegion, allSportsLabel: "All sports" }),
    [athletes, search, sport, selectedRegion],
  );
  const selectedRegionName = selectedRegion ? regionName(selectedRegion) : null;

  return (
    <main className="page-shell">
      <div className="discover-hero"><span className="eyebrow light">Discover Filipino talent</span><h1>Find a story to believe in.</h1><p>Behind every athlete is a dream—and a community that can help make it real.</p></div>
      <section className="map-section">
        <div className="map-head">
          <div><span className="eyebrow">Explore by region</span><h2>Athletes across the Philippines</h2><p>Select a region on the map to see the athletes training there.</p></div>
          {selectedRegion && <button className="text-button" onClick={() => setSelectedRegion(null)}><Icon name="close" size={16} /> All regions</button>}
        </div>
        <PhilippinesMap athletes={athletes} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />
      </section>
      <div className="filters">
        <label className="search-box"><Icon name="search" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search athletes, sports, or cities" /></label>
        <select value={sport} onChange={e => setSport(e.target.value)}><option>All sports</option>{[...new Set(athletes.map(a => a.sport))].map(s => <option key={s}>{s}</option>)}</select>
        <select value={selectedRegion ?? ""} onChange={e => setSelectedRegion(e.target.value || null)} aria-label="Filter by region">
          <option value="">All regions</option>
          {REGION_MAP.regions.map(r => <option key={r.regionCode} value={r.regionCode}>{r.name}</option>)}
        </select>
      </div>
      <section className="section compact">
        <div className="results-head"><div><span className="eyebrow">Athlete community</span><h2>{filtered.length} athlete{filtered.length === 1 ? "" : "s"}{selectedRegionName ? ` in ${selectedRegionName}` : " to cheer for"}</h2></div><span>Most supported</span></div>
        <div className="card-grid">{filtered.map(a => <AthleteCard key={a.id} athlete={a} />)}</div>
        {!filtered.length && <div className="empty"><h3>No athletes found</h3><p>Try broadening your search, choosing another region, or clearing a filter.</p></div>}
      </section>
    </main>
  );
}
