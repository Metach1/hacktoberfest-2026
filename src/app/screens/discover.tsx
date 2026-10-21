"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/** Map an athlete count to a choropleth intensity bucket (0 = empty). */
function intensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function PhilippinesMap({ athletes, selectedRegion, onSelectRegion }: { athletes: Athlete[]; selectedRegion: string | null; onSelectRegion: (regionCode: string | null) => void }) {
  const counts = useMemo(() => countByRegion(athletes), [athletes]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Approximate region centroids, measured from the rendered SVG path bounding
  // boxes on the client. Used only to place count badges; the data layer stays
  // unchanged. Empty on the server/first paint, which is fine (badges are
  // decorative and the paths carry accessible labels).
  const [centroids, setCentroids] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const next: Record<string, { x: number; y: number }> = {};
    svg.querySelectorAll<SVGPathElement>("path[data-region]").forEach((path) => {
      const code = path.dataset.region;
      if (!code) return;
      const box = path.getBBox();
      next[code] = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    setCentroids(next);
  }, [athletes]);

  const handleSelect = (regionCode: string, count: number) => {
    if (count === 0) return; // empty regions (incl. NIR) are not selectable
    onSelectRegion(selectedRegion === regionCode ? null : regionCode);
  };

  return (
    <div className="ph-map" role="group" aria-label="Interactive map of the Philippines. Select a region to see its athletes.">
      <svg ref={svgRef} className="ph-map-svg" viewBox={REGION_MAP.viewBox} aria-label="Philippine administrative regions">
        <defs>
          <filter id="ph-region-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#071c34" floodOpacity="0.35" />
          </filter>
        </defs>
        {REGION_MAP.regions.map(region => {
          const count = counts[region.regionCode] ?? 0;
          const populated = count > 0;
          const selected = selectedRegion === region.regionCode;
          const label = populated
            ? `${region.name}: ${count} athlete${count === 1 ? "" : "s"}`
            : `${region.name}: no athletes yet`;
          const cls = ["ph-region", populated ? "populated" : "empty", `i${intensity(count)}`, selected ? "selected" : ""].filter(Boolean).join(" ");
          return (
            <path
              key={region.regionCode}
              data-region={region.regionCode}
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
        {/* Count badges, drawn on top. Pointer events pass through to the path. */}
        {REGION_MAP.regions.map(region => {
          const count = counts[region.regionCode] ?? 0;
          const c = centroids[region.regionCode];
          if (count <= 0 || !c) return null;
          const selected = selectedRegion === region.regionCode;
          return (
            <g key={`b-${region.regionCode}`} className={selected ? "ph-badge selected" : "ph-badge"} aria-hidden="true">
              <circle cx={c.x} cy={c.y} r={6.2} />
              <text x={c.x} y={c.y} textAnchor="middle" dominantBaseline="central">{count}</text>
            </g>
          );
        })}
      </svg>
      <div className="ph-map-legend" aria-hidden="true">
        <span className="legend-scale">
          <span className="legend-label">Fewer</span>
          <span className="legend-swatch i1" />
          <span className="legend-swatch i2" />
          <span className="legend-swatch i3" />
          <span className="legend-swatch i4" />
          <span className="legend-label">More athletes</span>
        </span>
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
  const resultsRef = useRef<HTMLElement | null>(null);
  // Set when the user picks a region, so the effect below scrolls the catalog
  // into view once the new selection has rendered.
  const scrollPending = useRef(false);

  // The selected region is held in the URL so it is shareable and works with
  // the browser back button. A valid region code is one that exists on the map.
  const regionParam = searchParams.get("region");
  const selectedRegion = regionParam && REGION_MAP.regions.some(r => r.regionCode === regionParam)
    ? regionParam
    : null;

  const setSelectedRegion = useCallback((regionCode: string | null) => {
    if (regionCode) scrollPending.current = true;
    const params = new URLSearchParams(searchParams.toString());
    if (regionCode) params.set("region", regionCode);
    else params.delete("region");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  // After a region is chosen, bring the matching athlete catalog into view so
  // the map doubles as a jump-to-location control.
  useEffect(() => {
    if (selectedRegion && scrollPending.current) {
      scrollPending.current = false;
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedRegion]);

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
          <div>
            <span className="eyebrow">Explore by region</span>
            {selectedRegionName ? (
              <>
                <h2>{selectedRegionName}</h2>
                <p><Icon name="pin" size={15} /> {filtered.length} athlete{filtered.length === 1 ? "" : "s"} training here. Scroll down to meet them.</p>
              </>
            ) : (
              <>
                <h2>Athletes across the Philippines</h2>
                <p>Select a region on the map to jump straight to its athletes.</p>
              </>
            )}
          </div>
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
      <section className="section compact" ref={resultsRef}>
        <div className="results-head"><div><span className="eyebrow">Athlete community</span><h2>{filtered.length} athlete{filtered.length === 1 ? "" : "s"}{selectedRegionName ? ` in ${selectedRegionName}` : " to cheer for"}</h2></div><span>Most supported</span></div>
        <div className="card-grid">{filtered.map(a => <AthleteCard key={a.id} athlete={a} />)}</div>
        {!filtered.length && <div className="empty"><h3>No athletes found</h3><p>Try broadening your search, choosing another region, or clearing a filter.</p></div>}
      </section>
    </main>
  );
}
