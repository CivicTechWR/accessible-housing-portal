import type { Place, PlaceCategory, SamBlock } from "./neighbourhood.data";

const EARTH_RADIUS_M = 6_371_000;
export const MAX_BLOCK_DISTANCE_M = 2_000;
export const MAX_PLACE_DISTANCE_M = 5_000;

// TODO: Confirm these missing-store cutoffs with Statistics Canada.
export const WALKING_GROCERY_LIMIT_MINUTES = 30;
export const TRANSIT_GROCERY_LIMIT_MINUTES = 40;

type NearbyGroup = {
  id: string;
  label: string;
  category: PlaceCategory;
  kinds: readonly string[];
};

export const NEARBY_GROUPS: readonly NearbyGroup[] = [
  {
    id: "bus_stop",
    label: "Bus stop",
    category: "transit",
    kinds: ["highway=bus_stop", "public_transport=station", "amenity=bus_station"],
  },
  { id: "clinic", label: "Clinic or doctor", category: "health", kinds: ["amenity=doctors"] },
  { id: "pharmacy", label: "Pharmacy", category: "health", kinds: ["amenity=pharmacy"] },
  {
    id: "school",
    label: "School",
    category: "schools",
    kinds: ["amenity=school", "amenity=kindergarten"],
  },
  { id: "library", label: "Library", category: "libraries", kinds: ["amenity=library"] },
  {
    id: "park",
    label: "Park or playground",
    category: "parks",
    kinds: ["leisure=park", "leisure=playground", "leisure=garden", "leisure=nature_reserve"],
  },
  {
    id: "community",
    label: "Community or sports centre",
    category: "community_space",
    kinds: [
      "amenity=community_centre",
      "amenity=sports_centre",
      "leisure=sports_centre",
      "leisure=sports_hall",
    ],
  },
];

export type NearbyResult = {
  groupId: string;
  label: string;
  place: Place | null;
  distanceM: number | null;
};

export type NeighbourhoodDetailsResult = {
  block: SamBlock | null;
  nearby: NearbyResult[];
};

export function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lon2 - lon1);
  const latitude1 = toRadians(lat1);
  const latitude2 = toRadians(lat2);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDifference / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine));
}

export function findNearestBlock(lat: number, lon: number, blocks: SamBlock[]): SamBlock | null {
  let nearest: SamBlock | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const block of blocks) {
    const distance = haversineMetres(lat, lon, block.lat, block.lon);
    if (distance < nearestDistance) {
      nearest = block;
      nearestDistance = distance;
    }
  }

  return nearestDistance <= MAX_BLOCK_DISTANCE_M ? nearest : null;
}

export function findNearestPlaces(lat: number, lon: number, places: Place[]): NearbyResult[] {
  return NEARBY_GROUPS.map((group) => {
    let nearest: Place | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const place of places) {
      if (place.category !== group.category || !place.kind || !group.kinds.includes(place.kind)) {
        continue;
      }

      const distance = haversineMetres(lat, lon, place.lat, place.lon);
      if (distance < nearestDistance) {
        nearest = place;
        nearestDistance = distance;
      }
    }

    if (nearestDistance > MAX_PLACE_DISTANCE_M) {
      nearest = null;
      nearestDistance = Number.POSITIVE_INFINITY;
    }

    return {
      groupId: group.id,
      label: group.label,
      place: nearest,
      distanceM: nearest ? nearestDistance : null,
    };
  });
}

export function buildNeighbourhoodDetails(
  lat: number,
  lon: number,
  blocks: SamBlock[],
  places: Place[],
): NeighbourhoodDetailsResult {
  return {
    block: findNearestBlock(lat, lon, blocks),
    nearby: findNearestPlaces(lat, lon, places),
  };
}

export function formatDistance(metres: number): string {
  if (metres < 1_000) {
    return `${Math.round(metres)} m`;
  }

  return `${(metres / 1_000).toFixed(1)} km`;
}
