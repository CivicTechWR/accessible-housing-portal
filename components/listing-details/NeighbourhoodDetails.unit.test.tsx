import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import type { NeighbourhoodDetailsResult } from "@/lib/neighbourhood/neighbourhood";
import { NeighbourhoodDetails } from "./NeighbourhoodDetails";

const access = {
  health_care: 59,
  schools: 37,
  child_care: 88,
  post_secondary: 0,
  jobs: 53,
  culture_arts: 64,
  sport_recreation: 22,
};
const mode = {
  grocery_minutes: [15, 27, null] as [number | null, number | null, number | null],
  access,
};
const cyclingMode = {
  grocery_minutes: [9, 19, null] as [number | null, number | null, number | null],
  access: { ...access, health_care: 61, schools: 46 },
};

const details: NeighbourhoodDetailsResult = {
  block: {
    dbuid: "35300002003",
    lat: 43.4643,
    lon: -80.5204,
    walking: mode,
    transit_peak: mode,
    transit_offpeak: mode,
    cycling: cyclingMode,
  },
  nearby: [
    {
      groupId: "bus_stop",
      label: "Bus stop",
      place: {
        osm_id: "node/1",
        category: "transit",
        kind: "highway=bus_stop",
        name: "King Street",
        lat: 43.4644,
        lon: -80.5204,
        routes: "7;8",
        shelter: "yes",
        bench: "yes",
        wheelchair: "yes",
      },
      distanceM: 350,
    },
    {
      groupId: "clinic",
      label: "Clinic or doctor",
      place: {
        osm_id: "node/2",
        category: "health",
        kind: "amenity=doctors",
        lat: 43.4643,
        lon: -80.5204,
        wheelchair: "limited",
        opening_hours: "Mo-Fr 09:00-17:00",
      },
      distanceM: 1_234,
    },
    { groupId: "pharmacy", label: "Pharmacy", place: null, distanceM: null },
    {
      groupId: "library",
      label: "Library",
      place: {
        osm_id: "node/3",
        category: "libraries",
        kind: "amenity=library",
        name: "Central Library",
        lat: 43.4643,
        lon: -80.5204,
        opening_hours: "Mo-Sa 09:00-20:00",
      },
      distanceM: 0,
    },
  ],
};

describe("NeighbourhoodDetails", () => {
  it("renders nothing when details are unavailable", () => {
    const { container } = render(<NeighbourhoodDetails details={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows nearby place information and accessibility details", () => {
    render(<NeighbourhoodDetails details={details} />);

    const section = screen.getByRole("region", { name: "Neighbourhood" });
    within(section).getByText("King Street · 350 m");
    within(section).getByText("Routes: 7, 8");
    within(section).getByText("Shelter available");
    within(section).getByText("Bench available");
    within(section).getByText("Wheelchair accessible");
    within(section).getByText("Limited wheelchair access");
    within(section).getByText("Unnamed · 1.2 km");
    within(section).getByText("Hours: Mo-Fr 09:00-17:00");
    within(section).getByText("Hours: Mo-Sa 09:00-20:00");
    within(section).getByText("None within 5 km");
  });

  it("shows grocery travel times and a fallback for missing times", () => {
    const incompleteBlock = {
      ...details.block!,
      walking: { ...mode, grocery_minutes: [null, null, null] as [null, null, null] },
      transit_peak: { ...mode, grocery_minutes: [null, null, null] as [null, null, null] },
    };

    const { rerender } = render(<NeighbourhoodDetails details={details} />);
    expect(screen.getAllByText("15 min")).toHaveLength(2);
    screen.getByText("9 min");
    screen.getByText("Travel time to nearest grocery store");
    expect(screen.getAllByText("Transit (peak)")).toHaveLength(2);

    rerender(
      <NeighbourhoodDetails
        details={{
          ...details,
          block: incompleteBlock,
        }}
      />,
    );
    screen.getByText("None within 30 min");
    screen.getByText("None within 40 min");
  });

  it("shows access comparisons and correctly attributed external links", () => {
    render(<NeighbourhoodDetails details={details} />);

    expect(screen.getAllByText("Better than 59%")).toHaveLength(2);
    screen.getByRole("columnheader", { name: "Cycling" });
    const schoolsRow = screen.getByRole("row", { name: /Schools/ });
    expect(schoolsRow).toBeInTheDocument();
    const healthRow = screen.getByRole("row", { name: /Health care/ });
    within(healthRow).getByText("Better than 61%");
    screen.getByRole("heading", {
      name: "Access compared with the rest of Waterloo Region",
    });
    screen.getByRole("link", { name: "Statistics Canada Spatial Access Measures 2024" });
    const statcan = screen.getByRole("link", {
      name: "Statistics Canada Spatial Access Measures 2024",
    });
    expect(statcan).toHaveAttribute(
      "href",
      "https://www150.statcan.gc.ca/n1/en/catalogue/27260001",
    );
    expect(statcan).toHaveAttribute("target", "_blank");
    expect(statcan).toHaveAttribute("rel", "noopener noreferrer");

    const statcanLicense = screen.getByRole("link", { name: "Statistics Canada Open Licence" });
    expect(statcanLicense).toHaveAttribute(
      "href",
      "https://www.statcan.gc.ca/en/reference/licence",
    );
    expect(statcanLicense).toHaveAttribute("target", "_blank");
    expect(statcanLicense).toHaveAttribute("rel", "noopener noreferrer");

    const osm = screen.getByRole("link", { name: "© OpenStreetMap contributors" });
    expect(osm).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    expect(osm).toHaveAttribute("target", "_blank");
    expect(osm).toHaveAttribute("rel", "noopener noreferrer");
  });
});
