import type { Map as MaplibreMap } from "maplibre-gl";

export const MAP_STYLE_URLS = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

type PaintProperty = Parameters<MaplibreMap["setPaintProperty"]>[1];
type PaintOverrides = Array<[layerIds: string[], property: PaintProperty, value: string]>;

const DARK_MINOR_LABELS = [
  "highway_name_other",
  "highway_name_motorway",
  "place_other",
  "place_suburb",
  "place_village",
];
const DARK_MAJOR_LABELS = ["place_town", "place_city", "place_city_large"];
const DARK_MINOR_PLACE_LABELS = ["place_other", "place_suburb", "place_village"];

/**
 * OpenFreeMap's dark style draws water, parks and labels in near-black on black. These paint
 * overrides, by layer id, lift each layer to a colour that reads. Roads stay a step below the
 * labels so they don't compete with the price pins.
 */
const DARK_PAINT: PaintOverrides = [
  [["background"], "background-color", "#14181c"],
  [["water"], "fill-color", "#213649"],
  [["waterway"], "line-color", "#213649"],
  [["landuse_residential"], "fill-color", "#171b1f"],
  [["landcover_wood", "landuse_park"], "fill-color", "#18241e"],
  [["building"], "fill-color", "#1b2025"],
  [["building"], "fill-outline-color", "#232a30"],
  [["highway_path"], "line-color", "#272d33"],
  [["highway_minor"], "line-color", "#2d343b"],
  [
    ["highway_major_inner", "highway_major_subtle", "highway_motorway_subtle"],
    "line-color",
    "#384048",
  ],
  [["highway_major_casing", "highway_motorway_inner"], "line-color", "#424b54"],
  [["highway_motorway_casing"], "line-color", "#4d5761"],
  [["railway", "railway_minor", "railway_transit"], "line-color", "#363d44"],
  [["aeroway-area"], "fill-color", "#1b2025"],
  [["aeroway-runway", "aeroway-taxiway"], "line-color", "#2d343b"],
  [["water_name"], "text-color", "#7f9bb3"],
  [["water_name"], "text-halo-color", "#14181c"],
  [DARK_MINOR_LABELS, "text-color", "#aab3bc"],
  [DARK_MAJOR_LABELS, "text-color", "#c8d0d4"],
  [[...DARK_MINOR_LABELS, ...DARK_MAJOR_LABELS], "text-halo-color", "#14181c"],
];

/**
 * OpenFreeMap's Liberty style is a road atlas: orange motorways, yellow arterials, route shields
 * and bright parks, all louder than the price pins. These overrides turn it into a quiet grey
 * base so the pins carry the colour. Road layers are handled by pattern in `quietLightRoads`.
 */
const LIGHT_PAINT: PaintOverrides = [
  [["background"], "background-color", "#f6f6f4"],
  // Water and parks keep a clear tint: with the price pins, they are the landmarks people
  // orient by against the pale page.
  [["water"], "fill-color", "#cfe0f5"],
  [["waterway_river", "waterway_other", "waterway_tunnel"], "line-color", "#cfe0f5"],
  [["park", "landcover_grass", "landcover_wood"], "fill-color", "#e3efe0"],
  [["park"], "fill-outline-color", "#e3efe0"],
  [["park_outline"], "line-color", "#e3efe0"],
  // Land use (housing, schools, hospitals, sand) blends into the ground, so the map has one
  // neutral behind the pins instead of a patchwork of tinted blocks. Parks keep their green.
  [
    [
      "landuse_residential",
      "landuse_pitch",
      "landuse_track",
      "landuse_cemetery",
      "landuse_school",
      "landuse_hospital",
      "landcover_sand",
      "landcover_ice",
      "aeroway_fill",
    ],
    "fill-color",
    "#f6f6f4",
  ],
  [["building"], "fill-color", "#e8e8e5"],
  [["building"], "fill-outline-color", "#dfdfdb"],
  [["building-3d"], "fill-extrusion-color", "#e8e8e5"],
  [
    ["waterway_line_label", "water_name_point_label", "water_name_line_label"],
    "text-color",
    "#6f8597",
  ],
  [["highway-name-path", "highway-name-minor", "highway-name-major"], "text-color", "#7a7a7a"],
  [["highway-name-path"], "text-halo-color", "#f6f6f4"],
  [["label_other", "label_village"], "text-color", "#4a4a4a"],
  [["label_town", "label_city", "label_city_capital", "label_state"], "text-color", "#262626"],
];

type LayoutProperty = Parameters<MaplibreMap["setLayoutProperty"]>[1];
type LayoutValue = Parameters<MaplibreMap["setLayoutProperty"]>[2];
type LayoutOverrides = Array<[layerIds: string[], property: LayoutProperty, value: LayoutValue]>;

/**
 * Neighbourhood names are 10px at the search map's default zoom, too small to orient by, so they
 * grow a step. City and town names sit higher above their point, which is where listings bunch
 * up, so a price pin there is less likely to cover the name.
 */
const LIGHT_LAYOUT: LayoutOverrides = [
  [["label_other"], "text-size", ["interpolate", ["linear"], ["zoom"], 8, 10, 12, 12, 15, 14]],
  [["label_city", "label_city_capital", "label_town"], "text-offset", [0, -1.6]],
];

/**
 * The dark style sets place names in 10px capitals. These match the light style instead: city
 * names grow to 18px and neighbourhood names to 14px, in normal case.
 */
const DARK_LAYOUT: LayoutOverrides = [
  [[...DARK_MINOR_PLACE_LABELS, ...DARK_MAJOR_LABELS], "text-transform", "none"],
  [
    DARK_MINOR_PLACE_LABELS,
    "text-size",
    ["interpolate", ["linear"], ["zoom"], 8, 10, 12, 12, 15, 14],
  ],
  [["place_town"], "text-size", ["interpolate", ["linear"], ["zoom"], 7, 12, 11, 16]],
  [
    ["place_city", "place_city_large"],
    "text-size",
    ["interpolate", ["linear"], ["zoom"], 4, 11, 7, 13, 11, 18],
  ],
  [DARK_MAJOR_LABELS, "text-offset", [0, -1.6]],
];

/** Place names, hidden on the listing page's map, where the pin marks the only place that matters. */
const PLACE_LABELS = [
  "label_other",
  "label_village",
  "label_town",
  "label_city",
  "label_city_capital",
  "place_other",
  "place_suburb",
  "place_village",
  "place_town",
  "place_city",
  "place_city_large",
];

/** Route shields, points of interest and one-way arrows only add noise behind the pins. */
const LIGHT_HIDDEN = [
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
  "poi_r20",
  "poi_r7",
  "poi_r1",
  "poi_transit",
  "road_one_way_arrow",
  "road_one_way_arrow_opposite",
];

function applyPaint(map: MaplibreMap, overrides: PaintOverrides) {
  for (const [layerIds, property, value] of overrides) {
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, value);
    }
  }
}

/** Side streets, service roads and tracks, whose thin lines need a darker casing to show. */
const MINOR_ROAD = /_(minor|street|service_track)/;

/**
 * Every road is white with a grey casing, dark enough that the street grid reads against the pale
 * ground. Minor roads get a casing a step darker, since their lines are thinner. Rail keeps its
 * grey.
 */
function quietLightRoads(map: MaplibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== "line" || !/^(road|tunnel|bridge)_/.test(layer.id)) continue;
    if (/rail/.test(layer.id)) continue;
    const casing = MINOR_ROAD.test(layer.id) ? "#9e9e97" : "#b4b4ad";
    map.setPaintProperty(layer.id, "line-color", layer.id.includes("casing") ? casing : "#ffffff");
  }
}

/** Hides labels for side streets in the dark style; major road names stay. */
function hideDarkMinorStreetNames(map: MaplibreMap) {
  const layerId = "highway_name_other";
  if (!map.getLayer(layerId)) return;
  map.setFilter(layerId, [
    "all",
    ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false],
    ["match", ["get", "class"], ["trunk", "primary", "secondary"], true, false],
  ]);
}

function applyLayout(map: MaplibreMap, overrides: LayoutOverrides) {
  for (const [layerIds, property, value] of overrides) {
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, property, value);
    }
  }
}

function hide(map: MaplibreMap, layerIds: string[]) {
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", "none");
  }
}

/**
 * Restyles a freshly loaded basemap. Call again after every style load, because a new style drops
 * these. `hidePlaceLabels` is for a map centred on one pin, which would otherwise cover the name of
 * the city it sits in.
 */
export function applyMapStyleOverrides(
  map: MaplibreMap,
  isDark: boolean,
  { hidePlaceLabels = false }: { hidePlaceLabels?: boolean } = {},
) {
  if (hidePlaceLabels) hide(map, PLACE_LABELS);
  if (isDark) {
    applyPaint(map, DARK_PAINT);
    applyLayout(map, DARK_LAYOUT);
    hideDarkMinorStreetNames(map);
    return;
  }
  applyPaint(map, LIGHT_PAINT);
  quietLightRoads(map);
  hide(map, LIGHT_HIDDEN);
  applyLayout(map, LIGHT_LAYOUT);
}

/**
 * The compact attribution control starts expanded and only folds away once the map is dragged.
 * Fold it straight away so it shows as a small (i) button that opens the credits.
 */
export function foldAttribution(map: MaplibreMap) {
  map
    .getContainer()
    .querySelector(".maplibregl-compact-show")
    ?.classList.remove("maplibregl-compact-show");
}
