import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type SamMode = "walking" | "transit_peak" | "transit_offpeak" | "cycling";

export type SamAccess = {
  health_care: number | null;
  schools: number | null;
  child_care: number | null;
  post_secondary: number | null;
  jobs: number | null;
  culture_arts: number | null;
  sport_recreation: number | null;
};

export type SamModeData = {
  grocery_minutes: [number | null, number | null, number | null];
  access: SamAccess;
};

export type SamBlock = {
  dbuid: string;
  lat: number;
  lon: number;
} & Record<SamMode, SamModeData>;

export type PlaceCategory =
  | "transit"
  | "health"
  | "schools"
  | "libraries"
  | "parks"
  | "community_space";

export type Place = {
  osm_id: string;
  category: PlaceCategory;
  kind?: string;
  name?: string;
  lat: number;
  lon: number;
  wheelchair?: "yes" | "limited" | "no";
  routes?: string;
  shelter?: "yes" | "no";
  bench?: "yes" | "no";
  tactile_paving?: "yes" | "no";
  opening_hours?: string;
};

let blocksPromise: Promise<SamBlock[]> | undefined;
let placesPromise: Promise<Place[]> | undefined;

export function loadBlocks(): Promise<SamBlock[]> {
  blocksPromise ??= readFile(
    path.join(process.cwd(), "data", "neighbourhood", "waterloo-blocks.json"),
    "utf8",
  ).then((contents) => JSON.parse(contents) as SamBlock[]);

  return blocksPromise;
}

export function loadPlaces(): Promise<Place[]> {
  placesPromise ??= readFile(
    path.join(process.cwd(), "data", "neighbourhood", "waterloo-places.json"),
    "utf8",
  ).then((contents) => JSON.parse(contents) as Place[]);

  return placesPromise;
}
