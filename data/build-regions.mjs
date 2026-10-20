/**
 * Build-time prep script: convert a public, MIT-licensed GeoJSON of the 18
 * Philippine administrative regions into committed static SVG region paths.
 *
 * Input:  data/geojson/ph-regions-2019-lowres.geojson  (see geojson/SOURCE.md)
 * Output: data/ph-regions.json  — an array of { regionCode, name, svgPath }
 *
 * The output geometry is projected into the same viewBox convention already used
 * by `public/philippines-map.svg` (0 0 300 470) so the interactive map lines up
 * visually with the rest of the app. Coordinates are projected with a simple
 * equirectangular fit (longitude/latitude linearly scaled to the viewBox and the
 * Y axis flipped), which is more than accurate enough for a country-scale
 * clickable map and keeps the script dependency-free.
 *
 * The script fails loudly if any region does not resolve to a canonical code or
 * if the 18-region coverage is incomplete, mirroring the validation style of
 * `data/seed.mjs`.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { REGIONS, REGION_COUNT, resolveRegionCode, regionName } from "./regions.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = join(here, "geojson", "ph-regions-2019-lowres.geojson");
const outputPath = join(here, "ph-regions.json");

// Target viewBox, matching public/philippines-map.svg.
const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 470;
// A small inner margin so coastlines are not flush against the edges.
const MARGIN = 8;
// Round coordinates to keep the generated paths compact.
const PRECISION = 1;

/** The region-name property used by this GeoJSON source. */
const NAME_PROP = "ADM1_EN";

function regionFeatureName(feature) {
  const props = feature.properties ?? {};
  return props[NAME_PROP] ?? props.REGION ?? props.name ?? null;
}

/** Iterate every [lon, lat] coordinate pair in a Polygon/MultiPolygon geometry. */
function* eachCoord(geometry) {
  if (!geometry) return;
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      for (const point of ring) yield point;
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        for (const point of ring) yield point;
      }
    }
  }
}

/** Compute the lon/lat bounding box across all features. */
function computeBounds(features) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const feature of features) {
    for (const [lon, lat] of eachCoord(feature.geometry)) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLon, minLat, maxLon, maxLat };
}

/**
 * Build a projection function fitting the lon/lat bounds into the viewBox while
 * preserving aspect ratio and centering the result. Latitude is flipped because
 * SVG Y increases downward.
 */
function makeProjection(bounds) {
  const lonSpan = bounds.maxLon - bounds.minLon || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const usableW = VIEW_WIDTH - MARGIN * 2;
  const usableH = VIEW_HEIGHT - MARGIN * 2;
  const scale = Math.min(usableW / lonSpan, usableH / latSpan);
  const drawnW = lonSpan * scale;
  const drawnH = latSpan * scale;
  const offsetX = MARGIN + (usableW - drawnW) / 2;
  const offsetY = MARGIN + (usableH - drawnH) / 2;

  return ([lon, lat]) => {
    const x = offsetX + (lon - bounds.minLon) * scale;
    const y = offsetY + (bounds.maxLat - lat) * scale; // flip Y
    return [Number(x.toFixed(PRECISION)), Number(y.toFixed(PRECISION))];
  };
}

/** Convert a single ring (array of [lon, lat]) to an SVG subpath. */
function ringToSubpath(ring, project) {
  let d = "";
  ring.forEach((point, index) => {
    const [x, y] = project(point);
    d += `${index === 0 ? "M" : "L"}${x} ${y}`;
    if (index < ring.length - 1) d += " ";
  });
  return `${d}Z`;
}

/** Convert a Polygon/MultiPolygon geometry to a full SVG path `d` string. */
function geometryToPath(geometry, project) {
  const parts = [];
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      parts.push(ringToSubpath(ring, project));
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        parts.push(ringToSubpath(ring, project));
      }
    }
  } else {
    throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
  return parts.join(" ");
}

async function build() {
  const raw = await readFile(inputPath, "utf8");
  const geojson = JSON.parse(raw);
  const features = geojson.features ?? [];

  if (features.length !== REGION_COUNT) {
    throw new Error(
      `Expected ${REGION_COUNT} region features; found ${features.length}.`,
    );
  }

  const bounds = computeBounds(features);
  const project = makeProjection(bounds);

  const seenCodes = new Set();
  const regions = features.map((feature) => {
    const name = regionFeatureName(feature);
    const regionCode = resolveRegionCode(name);
    if (!regionCode) {
      throw new Error(`Unmatched region name in GeoJSON: ${JSON.stringify(name)}.`);
    }
    if (seenCodes.has(regionCode)) {
      throw new Error(`Duplicate region code resolved: ${regionCode}.`);
    }
    seenCodes.add(regionCode);

    const svgPath = geometryToPath(feature.geometry, project);
    if (!svgPath.startsWith("M")) {
      throw new Error(`Generated path for ${regionCode} did not start with M.`);
    }

    return {
      regionCode,
      name: regionName(regionCode) ?? name,
      svgPath,
    };
  });

  // Confirm full canonical coverage (all 18 codes present exactly once).
  const expected = new Set(REGIONS.map((r) => r.regionCode));
  const missing = [...expected].filter((code) => !seenCodes.has(code));
  if (missing.length > 0) {
    throw new Error(`Missing region coverage: ${missing.join(", ")}.`);
  }

  // Deterministic order: follow the canonical taxonomy order.
  const order = new Map(REGIONS.map((r, i) => [r.regionCode, i]));
  regions.sort((a, b) => order.get(a.regionCode) - order.get(b.regionCode));

  const output = {
    description:
      "Static SVG region paths for the 18 Philippine administrative regions, " +
      "projected to a 300x470 viewBox. Derived from MIT-licensed GeoJSON " +
      "(faeldon/philippines-json-maps); see data/geojson/SOURCE.md.",
    viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`,
    regions,
  };

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${regions.length} region paths to ${outputPath} ` +
      `(viewBox ${output.viewBox}).`,
  );
}

build().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
