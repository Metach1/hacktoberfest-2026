"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AthleteCard, Icon, peso } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";
import type { Athlete } from "@/src/app/data/athletes";
import { regionName } from "@/src/app/lib/regions";
import { isSupabaseConfigured } from "@/src/app/lib/supabase/client";
import { toAthlete } from "@/src/app/lib/profile-adapter";
import { getPublicAthleteProfiles } from "@/src/app/services/profile";
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

/** The map's full extent, used to compute the zoom transform. */
const FULL_VB = (() => {
  const [x, y, w, h] = REGION_MAP.viewBox.split(/\s+/).map(Number);
  return { x, y, w, h };
})();

function PhilippinesMap({
  athletes,
  selectedRegion,
  onSelectRegion,
}: {
  athletes: Athlete[];
  selectedRegion: string | null;
  onSelectRegion: (regionCode: string | null) => void;
}) {
  const counts = useMemo(() => countByRegion(athletes), [athletes]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<SVGGElement | null>(null);

  // Zoom is applied as an SVG transform on an inner <g>, which (unlike the
  // viewBox attribute) animates smoothly via CSS transition. The transform must
  // be measured from the rendered DOM (getBBox) after mount, so we write it
  // imperatively to the <g> rather than via React state — this both satisfies
  // the project's no-setState-in-effect lint rule and keeps getBBox out of the
  // static prerender render path (a hard requirement under Next 16 Cache
  // Components).
  useEffect(() => {
    const svg = svgRef.current;
    const g = zoomRef.current;
    if (!svg || !g) return;

    if (!selectedRegion) {
      g.removeAttribute("transform"); // reset to full extent
      return;
    }
    const path = svg.querySelector<SVGPathElement>(`path[data-region="${selectedRegion}"]`);
    if (!path) {
      g.removeAttribute("transform");
      return;
    }
    const box = path.getBBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // Scale so the region fills ~62% of the frame, then recenter on it.
    const scale = Math.min(
      (FULL_VB.w * 0.62) / Math.max(box.width, 1),
      (FULL_VB.h * 0.62) / Math.max(box.height, 1),
      4.2,
    );
    const tx = FULL_VB.x + FULL_VB.w / 2 - cx * scale;
    const ty = FULL_VB.y + FULL_VB.h / 2 - cy * scale;
    g.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
  }, [selectedRegion, athletes]);

  const handleSelect = (regionCode: string) => {
    onSelectRegion(selectedRegion === regionCode ? null : regionCode);
  };

  return (
    <div className="ph-map" role="group" aria-label="Interactive map of the Philippines. Select a region to see its athletes.">
      <svg
        ref={svgRef}
        className="ph-map-svg"
        viewBox={REGION_MAP.viewBox}
        aria-label="Philippine administrative regions"
      >
        <defs>
          <filter id="ph-region-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#071c34" floodOpacity="0.35" />
          </filter>
        </defs>
        <g ref={zoomRef} className="ph-zoom">
        {REGION_MAP.regions.map((region) => {
          const count = counts[region.regionCode] ?? 0;
          const populated = count > 0;
          const selected = selectedRegion === region.regionCode;
          const label = populated
            ? `${region.name}: ${count} athlete${count === 1 ? "" : "s"}`
            : `${region.name}: no athletes yet`;
          const cls = [
            "ph-region",
            populated ? "populated" : "empty",
            `i${intensity(count)}`,
            selected ? "selected" : "",
          ].filter(Boolean).join(" ");
          return (
            <path
              key={region.regionCode}
              data-region={region.regionCode}
              d={region.svgPath}
              className={cls}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={selected}
              onClick={() => handleSelect(region.regionCode)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(region.regionCode);
                }
              }}
            >
              <title>{label}</title>
            </path>
          );
        })}
        </g>
      </svg>
    </div>
  );
}

/** A single brief, text-only athlete row for the compact region/search list. */
function AthleteRow({ athlete }: { athlete: Athlete }) {
  const percent = athlete.goal > 0 ? Math.round((athlete.raised / athlete.goal) * 100) : 0;
  return (
    <Link className="region-row" href={`/athletes/${athlete.profileId ?? athlete.id}`}>
      <div className="region-row-head">
        <strong>{athlete.name}</strong>
        {athlete.verified && <span className="verified" title="Verified athlete"><Icon name="check" size={11} /></span>}
      </div>
      <span className="region-row-meta"><Icon name="pin" size={13} /> {athlete.location} · {athlete.sport}</span>
      <div className="region-row-progress"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div>
      <small className="region-row-fund">{peso(athlete.raised)} raised · {percent}%</small>
    </Link>
  );
}

export function DiscoverScreen() {
  const { athletes: demoAthletes } = useStarlete();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [registeredAthletes, setRegisteredAthletes] = useState<Athlete[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("All sports");
  // Whether the full catalog grid is expanded. Reset whenever the active
  // selection/search changes so "Expand" always reflects the current results.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    getPublicAthleteProfiles()
      .then((profiles) => {
        if (active) setRegisteredAthletes(profiles.map((profile, index) => toAthlete(profile, -(index + 1))));
      })
      .catch((error: unknown) => {
        if (active) setProfileError(error instanceof Error ? error.message : "Could not load athlete profiles.");
      });
    return () => { active = false; };
  }, []);

  const athletes = useMemo(
    () => [...demoAthletes, ...registeredAthletes],
    [demoAthletes, registeredAthletes],
  );

  // The selected region is held in the URL so it is shareable and works with
  // the browser back button. A valid region code is one that exists on the map.
  const regionParam = searchParams.get("region");
  const selectedRegion = regionParam && REGION_MAP.regions.some((r) => r.regionCode === regionParam)
    ? regionParam
    : null;

  const setSelectedRegion = useCallback((regionCode: string | null) => {
    setExpanded(false); // a new selection always starts collapsed
    const params = new URLSearchParams(searchParams.toString());
    if (regionCode) params.set("region", regionCode);
    else params.delete("region");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const onSearchChange = (value: string) => { setSearch(value); setExpanded(false); };
  const onSportChange = (value: string) => { setSport(value); setExpanded(false); };

  const searching = search.trim().length > 0;
  // The compact list is active whenever the user has made a choice: a region on
  // the map, a region/sport filter, or a search term.
  const listActive = Boolean(selectedRegion) || searching || sport !== "All sports";

  const filtered = useMemo(
    () => filterAthletes(athletes, { search, sport, region: selectedRegion, allSportsLabel: "All sports" }),
    [athletes, search, sport, selectedRegion],
  );
  const selectedRegionName = selectedRegion ? regionName(selectedRegion) : null;

  const clearSelection = useCallback(() => {
    setSelectedRegion(null);
    setSearch("");
    setSport("All sports");
    setExpanded(false);
  }, [setSelectedRegion]);

  // Deselect on a click anywhere outside the interactive controls, or on
  // Escape. Only listens while a selection is active, and skips clicks landing
  // on a map region, a form control, the search box, or the compact list — the
  // elements the user is meant to interact with. The expanded catalog modal has
  // its own dismissal, so pause this while it is open.
  useEffect(() => {
    if (!listActive || expanded) return;
    const INTERACTIVE = "[data-region], .region-list, .search-box, select, input, button, a";
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && target.closest(INTERACTIVE)) return;
      clearSelection();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [listActive, expanded, clearSelection]);

  const headingName = selectedRegionName ?? "the Philippines";

  return (
    <main className="page-shell">
      {profileError && <p className="field-error" role="alert">{profileError}</p>}
      <div className="discover-hero">
        <span className="eyebrow light">Discover Filipino talent</span>
        <h1>Find a story to believe in.</h1>
        <p>Behind every athlete is a dream—and a community that can help make it real.</p>
      </div>

      <section className="map-explorer">
        {/* LEFT: headers, search, filters, and the compact results list. */}
        <div className="explorer-panel">
          <span className="eyebrow">Explore by region</span>
          <h2>Athletes across<br />{headingName}</h2>
          <p className="explorer-sub">Select a region on the map, or search, to meet the athletes training there.</p>

          <div className="explorer-controls">
            <label className="search-box"><Icon name="search" /><input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search athletes, sports, or cities" /></label>
            <div className="explorer-filters">
              <select value={sport} onChange={(e) => onSportChange(e.target.value)} aria-label="Filter by sport">
                <option>All sports</option>
                {[...new Set(athletes.map((a) => a.sport))].map((s) => <option key={s}>{s}</option>)}
              </select>
              <select value={selectedRegion ?? ""} onChange={(e) => setSelectedRegion(e.target.value || null)} aria-label="Filter by region">
                <option value="">All regions</option>
                {REGION_MAP.regions.map((r) => <option key={r.regionCode} value={r.regionCode}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {listActive && (
            <div className="region-list">
              <div className="region-list-head">
                <span>{filtered.length} athlete{filtered.length === 1 ? "" : "s"}{selectedRegionName ? ` in ${selectedRegionName}` : ""}</span>
                {Boolean(filtered.length) && (
                  <button type="button" className="text-button" onClick={() => setExpanded(true)}>
                    Expand <Icon name="arrow" size={15} />
                  </button>
                )}
              </div>
              <div className="region-list-scroll">
                {filtered.length ? (
                  filtered.map((a) => <AthleteRow key={a.id} athlete={a} />)
                ) : (
                  <p className="region-empty">{selectedRegionName ? `No athletes in ${selectedRegionName} yet.` : "No athletes match your search."}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: the interactive, zooming map. */}
        <div className="explorer-map">
          <PhilippinesMap athletes={athletes} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />
        </div>
      </section>

      {/* Expanded detailed catalog: a solid sheet that slides up over the
          explorer so the catalog comes to the user, reusing the existing
          AthleteCard grid. */}
      {expanded && (
        <div className="modal-backdrop catalog-backdrop" onClick={() => setExpanded(false)}>
          <div className="catalog-sheet" role="dialog" aria-modal="true" aria-label="Athlete catalog" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setExpanded(false)} aria-label="Close catalog"><Icon name="close" /></button>
            <div className="results-head">
              <div>
                <span className="eyebrow">Athlete community</span>
                <h2>{filtered.length} athlete{filtered.length === 1 ? "" : "s"}{selectedRegionName ? ` in ${selectedRegionName}` : " to cheer for"}</h2>
              </div>
            </div>
            <div className="catalog-sheet-scroll">
              <div className="card-grid">{filtered.map((a) => <AthleteCard key={a.id} athlete={a} />)}</div>
              {!filtered.length && <div className="empty"><h3>No athletes found</h3><p>Try broadening your search, choosing another region, or clearing a filter.</p></div>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
