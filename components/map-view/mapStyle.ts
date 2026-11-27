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

/**
 * OpenFreeMap's dark style draws water, parks and labels in near-black on black. These paint
 * overrides, by layer id, lift each layer to a colour that reads. Roads stay a step below the
 * labels so they don't compete with the price pins.
 */
const DARK_PAINT: PaintOverrides = [
  [["background"], "background-color", "#14181c"],
  [["water"], "fill-color", "#1d2d3a"],
  [["waterway"], "line-color", "#1d2d3a"],
  [["landuse_residential"], "fill-color", "#171b1f"],
  [["landcover_wood", "landuse_park"], "fill-color", "#18241e"],
  [["building"], "fill-color", "#1b2025"],
  [["building"], "fill-outline-color", "#232a30"],
  [["highway_path"], "line-color", "#21262b"],
  [["highway_minor"], "line-color", "#252b31"],
  [
    ["highway_major_inner", "highway_major_subtle", "highway_motorway_subtle"],
    "line-color",
    "#2f353c",
  ],
  [["highway_major_casing", "highway_motorway_inner"], "line-color", "#373f47"],
  [["highway_motorway_casing"], "line-color", "#424b54"],
  [["railway", "railway_minor", "railway_transit"], "line-color", "#30373e"],
  [["water_name"], "text-color", "#7f9bb3"],
  [["water_name"], "text-halo-color", "#14181c"],
  [DARK_MINOR_LABELS, "text-color", "#aab3bc"],
  [DARK_MAJOR_LABELS, "text-color", "#c4ccd3"],
  [[...DARK_MINOR_LABELS, ...DARK_MAJOR_LABELS], "text-halo-color", "#14181c"],
];

/**
 * OpenFreeMap's Liberty style is a road atlas: orange motorways, yellow arterials, route shields
 * and bright parks, all louder than the price pins. These overrides turn it into a quiet grey
 * base so the pins carry the colour. Road layers are handled by pattern in `quietLightRoads`.
 */
const LIGHT_PAINT: PaintOverrides = [
  [["background"], "background-color", "#f6f6f4"],
  [["water"], "fill-color", "#cfdde8"],
  [["waterway_river", "waterway_other", "waterway_tunnel"], "line-color", "#cfdde8"],
  [["park", "landcover_grass"], "fill-color", "#e2ecdc"],
  [["park"], "fill-outline-color", "#e2ecdc"],
  [["park_outline"], "line-color", "#e2ecdc"],
  [["landcover_wood"], "fill-color", "#dce8d4"],
  [
    ["landuse_pitch", "landuse_track", "landuse_cemetery", "landuse_school", "landuse_hospital"],
    "fill-color",
    "#ecede8",
  ],
  [["building"], "fill-color", "#e8e8e5"],
  [["building"], "fill-outline-color", "#dfdfdb"],
  [["building-3d"], "fill-extrusion-color", "#e8e8e5"],
  [
    ["waterway_line_label", "water_name_point_label", "water_name_line_label"],
    "text-color",
    "#6f8597",
  ],
  [["highway-name-path", "highway-name-minor", "highway-name-major"], "text-color", "#8a8a8a"],
  [["highway-name-path"], "text-halo-color", "#f6f6f4"],
  [["label_other", "label_village"], "text-color", "#5c5c5c"],
  [["label_town", "label_city", "label_city_capital", "label_state"], "text-color", "#3a3a3a"],
];

type LayoutProperty = Parameters<MaplibreMap["setLayoutProperty"]>[1];
type LayoutValue = Parameters<MaplibreMap["setLayoutProperty"]>[2];

/**
 * Neighbourhood names are 10px at the search map's default zoom, too small to orient by, so they
 * grow a step. City and town names sit higher above their point, which is where listings bunch
 * up, so a price pin there is less likely to cover the name.
 */
const LIGHT_LAYOUT: Array<[layerIds: string[], property: LayoutProperty, value: LayoutValue]> = [
  [["label_other"], "text-size", ["interpolate", ["linear"], ["zoom"], 8, 10, 12, 12, 15, 14]],
  [["label_city", "label_city_capital", "label_town"], "text-offset", [0, -1.6]],
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

/** Every road is white with a grey casing, whatever its class. Rail keeps its grey. */
function quietLightRoads(map: MaplibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== "line" || !/^(road|tunnel|bridge)_/.test(layer.id)) continue;
    if (/rail/.test(layer.id)) continue;
    map.setPaintProperty(
      layer.id,
      "line-color",
      layer.id.includes("casing") ? "#c8c8c2" : "#ffffff",
    );
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
    hideDarkMinorStreetNames(map);
    return;
  }
  applyPaint(map, LIGHT_PAINT);
  quietLightRoads(map);
  hide(map, LIGHT_HIDDEN);
  for (const [layerIds, property, value] of LIGHT_LAYOUT) {
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, property, value);
    }
  }
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
