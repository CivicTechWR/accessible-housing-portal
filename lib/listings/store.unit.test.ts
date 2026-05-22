import { describe, expect, it } from "@jest/globals";

import type { ListingCustomFields } from "@/db/schema";
import {
  buildListingCustomFields,
  buildListingFeatureCategories,
  getDisplayAccessibilityFeatures,
  getListingApplicationUrl,
} from "./store";

describe("buildListingFeatureCategories", () => {
  it("applies alphabetical category order and per-category sort order for custom fields", () => {
    const features = buildListingFeatureCategories(
      {
        building_alpha: true,
        building_beta: true,
        unit_alpha: true,
        unit_beta: true,
      } satisfies ListingCustomFields,
      [
        {
          key: "unit_beta",
          label: "Unit Beta",
          description: null,
          category: "UNIT INTERIOR",
          sortOrder: 2,
        },
        {
          key: "building_beta",
          label: "Building Beta",
          description: null,
          category: "BUILDING AMENITIES",
          sortOrder: 2,
        },
        {
          key: "building_alpha",
          label: "Building Alpha",
          description: null,
          category: "BUILDING AMENITIES",
          sortOrder: 1,
        },
        {
          key: "unit_alpha",
          label: "Unit Alpha",
          description: null,
          category: "UNIT INTERIOR",
          sortOrder: 1,
        },
      ],
    );

    expect(features.map((category) => category.categoryName)).toEqual([
      "BUILDING AMENITIES",
      "UNIT INTERIOR",
    ]);
    expect(features[0]?.features.map((feature) => feature.name)).toEqual([
      "Building Alpha",
      "Building Beta",
    ]);
    expect(features[1]?.features.map((feature) => feature.name)).toEqual([
      "Unit Alpha",
      "Unit Beta",
    ]);
  });

  it("maps legacy accessibility labels onto canonical boolean field labels", () => {
    const features = buildListingFeatureCategories(
      {
        accessibilityFeatures: ["Elevator access"],
      } satisfies ListingCustomFields,
      [
        {
          key: "elevator_in_building",
          label: "Elevator in Building",
          description: "The building has at least one elevator.",
          category: "BUILDING AMENITIES",
          sortOrder: 1,
        },
      ],
    );

    expect(features).toEqual([
      {
        categoryName: "BUILDING AMENITIES",
        features: [
          {
            name: "Elevator in Building",
            description: "The building has at least one elevator.",
          },
        ],
      },
    ]);
  });
});

describe("buildListingCustomFields", () => {
  it("persists selected feature ids as boolean custom fields", () => {
    const customFields = buildListingCustomFields({
      title: "Accessible listing",
      name: "Cedar Court",
      description: undefined,
      address: {
        street: "123 Main Street",
        street2: undefined,
        city: "Waterloo",
        province: "ON",
        postalCode: "N2L 3A1",
      },
      units: [
        {
          bedrooms: 1,
          bathrooms: 1,
          sqft: 600,
          rent: 1500,
          availableDate: "2026-05-01",
        },
      ],
      amenities: [],
      accessibilityFeatures: [
        {
          id: "elevator_in_building",
          name: "Elevator in Building",
          description: "The building has at least one elevator.",
        },
      ],
      applicationMethod: "internal",
      eligibilityCriteria: {},
      images: [],
      contact: {
        name: "Leasing Office",
        email: "leasing@example.org",
        phone: "519-555-0100",
      },
      status: "draft",
      propertyType: "Rent",
      buildingType: "Apartment",
      leaseTerm: "1 year",
      utilitiesIncluded: [],
    });

    expect(customFields.elevator_in_building).toBe(true);
    expect(customFields.accessibilityFeatures).toBeUndefined();
  });
});

describe("getDisplayAccessibilityFeatures", () => {
  it("prefers canonical labels from boolean definitions for legacy feature values", () => {
    const features = getDisplayAccessibilityFeatures(
      {
        accessibilityFeatures: ["Automatic door opener", "Elevator access"],
      } satisfies ListingCustomFields,
      [
        {
          key: "automated_building_doors",
          label: "Automated Building Doors",
          description: "Common-area doors open automatically.",
          category: "BUILDING AMENITIES",
          sortOrder: 2,
        },
        {
          key: "elevator_in_building",
          label: "Elevator in Building",
          description: "The building has at least one elevator.",
          category: "BUILDING AMENITIES",
          sortOrder: 1,
        },
      ],
    );

    expect(features.map((feature) => feature.name)).toEqual([
      "Elevator in Building",
      "Automated Building Doors",
    ]);
  });
});

describe("getListingApplicationUrl", () => {
  it("falls back to the stored external application URL when the listing column is empty", () => {
    expect(
      getListingApplicationUrl(null, {
        externalApplicationUrl: "https://example.org/legacy-apply",
      }),
    ).toBe("https://example.org/legacy-apply");
  });
});
