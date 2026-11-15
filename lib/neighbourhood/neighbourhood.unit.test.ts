import { describe, expect, it } from "@jest/globals";

import type { Place, SamBlock, SamModeData } from "./neighbourhood.data";
import {
  buildNeighbourhoodDetails,
  findNearestBlock,
  findNearestPlaces,
  formatDistance,
  haversineMetres,
} from "./neighbourhood";

const emptyMode: SamModeData = {
  grocery_minutes: [null, null, null],
  access: {
    health_care: null,
    schools: null,
    child_care: null,
    post_secondary: null,
    jobs: null,
    culture_arts: null,
    sport_recreation: null,
  },
};

function block(lat: number, lon: number): SamBlock {
  return {
    dbuid: "35300002003",
    lat,
    lon,
    walking: emptyMode,
    transit_peak: emptyMode,
    transit_offpeak: emptyMode,
    cycling: emptyMode,
  };
}

describe("neighbourhood calculations", () => {
  it("calculates haversine distances in metres", () => {
    expect(haversineMetres(43.4643, -80.5204, 43.4643, -80.5204)).toBe(0);
    expect(haversineMetres(0, 0, 1, 0)).toBeCloseTo(111_195, 0);
  });

  it("selects the nearest block within range", () => {
    const closest = block(43.4644, -80.5204);
    const farther = block(43.47, -80.5204);

    expect(findNearestBlock(43.4643, -80.5204, [farther, closest])).toBe(closest);
    expect(findNearestBlock(43.4643, -80.5204, [block(43.49, -80.5204)])).toBeNull();
    expect(findNearestBlock(43.4643, -80.5204, [])).toBeNull();
  });

  it("finds the nearest allowed place and ignores excluded and untyped kinds", () => {
    const nearbyPark: Place = {
      osm_id: "way/1",
      category: "parks",
      kind: "leisure=park",
      name: "Central Park",
      lat: 43.4644,
      lon: -80.5204,
    };
    const fartherPark: Place = {
      ...nearbyPark,
      osm_id: "way/2",
      name: "Farther Park",
      lat: 43.47,
    };
    const wetland: Place = {
      osm_id: "way/3",
      category: "parks",
      kind: "natural=wetland",
      lat: 43.46431,
      lon: -80.5204,
    };
    const missingKind: Place = {
      osm_id: "way/4",
      category: "parks",
      lat: 43.4643,
      lon: -80.5204,
    };
    const results = findNearestPlaces(43.4643, -80.5204, [
      fartherPark,
      wetland,
      missingKind,
      nearbyPark,
    ]);

    const park = results.find((result) => result.groupId === "park");
    expect(park).toMatchObject({ place: nearbyPark, label: "Park or playground" });
    expect(park?.distanceM).toBeCloseTo(11.1, 0);
  });

  it("finds an amenity=clinic place in the clinic group", () => {
    const clinic: Place = {
      osm_id: "node/clinic",
      category: "health",
      kind: "amenity=clinic",
      name: "Community Clinic",
      lat: 43.4644,
      lon: -80.5204,
    };

    const result = findNearestPlaces(43.4643, -80.5204, [clinic]);

    expect(result.find((item) => item.groupId === "clinic")?.place).toBe(clinic);
  });

  it("returns an empty result when no allowed place is within range", () => {
    const results = findNearestPlaces(43.4643, -80.5204, [
      {
        osm_id: "node/1",
        category: "transit",
        kind: "highway=bus_stop",
        lat: 43.52,
        lon: -80.5204,
      },
    ]);

    expect(results.find((result) => result.groupId === "bus_stop")).toMatchObject({
      place: null,
      distanceM: null,
    });
  });

  it("formats distances in metres below one kilometre and one-decimal kilometres otherwise", () => {
    expect(formatDistance(347)).toBe("350 m");
    expect(formatDistance(994)).toBe("990 m");
    expect(formatDistance(995)).toBe("1.0 km");
    expect(formatDistance(1_234)).toBe("1.2 km");
  });

  it("builds a result containing the closest block and nearby place groups", () => {
    const result = buildNeighbourhoodDetails(43.4643, -80.5204, [block(43.4643, -80.5204)], []);

    expect(result.block?.dbuid).toBe("35300002003");
    expect(result.nearby).toHaveLength(7);
  });
});
