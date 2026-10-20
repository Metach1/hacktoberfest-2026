# Region boundary source

`ph-regions-2019-lowres.geojson` is the input to the region-map prep script
(`data/build-regions.mjs`), which projects it into the static SVG region paths
in `data/ph-regions.json`.

## Provenance

- **File:** `2019/geojson/regions/lowres/regions.0.001.json`
- **Source project:** `faeldon/philippines-json-maps` — Philippine administrative
  boundaries in GeoJSON/TopoJSON at several resolutions.
- **Repository:** https://github.com/faeldon/philippines-json-maps
- **License:** MIT License, Copyright (c) James Faeldon. The MIT license permits
  use, modification, and redistribution with attribution; this file and the note
  here preserve that attribution.
- **Underlying boundaries:** Philippine administrative boundaries. The 2019
  dataset includes all 18 regions, among them the Negros Island Region (NIR,
  PSGC `PH180000000`).

## Why the "lowres" variant

The low-resolution simplification keeps the committed file and generated SVG
paths small while remaining geographically faithful region outlines. It is used
for a stylized-but-accurate interactive map, not for precise GIS measurement.

## Fake-data note

This file contains only public geographic boundary geometry. It carries no
athlete data and no personal information. All athlete content in this project is
fictional; see `../README.md`.
