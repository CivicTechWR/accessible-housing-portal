import { describe, expect, it } from "@jest/globals";

import type {
  CustomListingFieldApplicability,
  Listing,
  ListingCustomFields,
  Property,
} from "@/db/schema";
import {
  buildDuplicateListingPlan,
  buildDuplicateListingTitle,
  buildListingCustomFields,
  buildListingFeatureCategories,
  DEFAULT_PROPERTY_COUNTRY,
  getDisplayAccessibilityFeatures,
  selectDuplicateCustomFields,
  getListingApplicationUrl,
  mergeListingCustomFields,
} from "./store";

describe("buildDuplicateListingTitle", () => {
  it("prefixes titled listings and keeps untitled drafts untitled", () => {
    expect(buildDuplicateListingTitle("Sunny 2BR near uptown")).toBe(
      "Copy of Sunny 2BR near uptown",
    );
    expect(buildDuplicateListingTitle("")).toBe("");
    expect(buildDuplicateListingTitle("   ")).toBe("");
  });
});

describe("selectDuplicateCustomFields", () => {
  const customFields: ListingCustomFields = {
    elevator_in_building: true,
    main_entrance_is_barrier_free: true,
    roll_in_shower: true,
    legacy_unmapped_feature: true,
  };
  const applicabilityByKey = new Map<string, CustomListingFieldApplicability>([
    ["elevator_in_building", "building"],
    ["main_entrance_is_barrier_free", "building"],
    ["roll_in_shower", "unit"],
  ]);

  it("keeps every feature when all fields are copied", () => {
    expect(selectDuplicateCustomFields({ customFields, applicabilityByKey, scope: "all" })).toEqual(
      customFields,
    );
  });

  it("keeps only building-level features for the building scope", () => {
    expect(
      selectDuplicateCustomFields({ customFields, applicabilityByKey, scope: "building" }),
    ).toEqual({
      elevator_in_building: true,
      main_entrance_is_barrier_free: true,
    });
  });

  it("keeps unit-level and unrecognized features for the unit scope", () => {
    expect(
      selectDuplicateCustomFields({ customFields, applicabilityByKey, scope: "unit" }),
    ).toEqual({
      roll_in_shower: true,
      legacy_unmapped_feature: true,
    });
  });
});

describe("buildDuplicateListingPlan", () => {
  const OWNER_USER_ID = "11111111-1111-4111-8111-111111111111";
  const ACTOR_USER_ID = "22222222-2222-4222-8222-222222222222";

  const sourceProperty: Property = {
    id: "33333333-3333-4333-8333-333333333333",
    ownerUserId: OWNER_USER_ID,
    name: "Riverbend Apartments",
    street1: "120 King St W",
    street2: "Suite 4",
    city: "Kitchener",
    province: "ON",
    postalCode: "N2G 1A7",
    country: "Canada",
    neighborhood: "Downtown",
    latitude: 43.4516,
    longitude: -80.4925,
    contactName: "Dana Reyes",
    contactEmail: "dana@example.com",
    contactPhone: "519-555-0142",
    createdByUserId: OWNER_USER_ID,
    updatedByUserId: OWNER_USER_ID,
    createdAt: new Date("2026-01-05T00:00:00Z"),
    updatedAt: new Date("2026-02-05T00:00:00Z"),
  };

  const source: Listing = {
    id: "44444444-4444-4444-8444-444444444444",
    propertyId: sourceProperty.id,
    createdByUserId: OWNER_USER_ID,
    updatedByUserId: OWNER_USER_ID,
    title: "Sunny 2BR near uptown",
    description: "Bright corner unit.",
    status: "published",
    unitNumber: "301",
    buildingType: "apartment",
    bedrooms: 2,
    bathrooms: 1.5,
    squareFeet: 880,
    monthlyRentCents: 185000,
    availableOn: "2026-09-01",
    leaseTermMonths: 12,
    utilitiesIncluded: ["heat", "water"],
    maxIncomeCents: 7200000,
    applicationUrl: "https://example.com/apply",
    applicationEmail: "apply@example.com",
    applicationPhone: "519-555-0143",
    applicationInstructions: "Bring proof of income.",
    customFields: { elevator_in_building: true },
    publishedAt: new Date("2026-03-01T00:00:00Z"),
    archivedAt: null,
    createdAt: new Date("2026-01-06T00:00:00Z"),
    updatedAt: new Date("2026-02-06T00:00:00Z"),
  };

  const planFor = (scope: "all" | "building" | "unit") =>
    buildDuplicateListingPlan({
      source,
      sourceProperty,
      actorUserId: ACTOR_USER_ID,
      title: "Copy of Sunny 2BR near uptown",
      scope,
      customFields: { elevator_in_building: true },
    });

  it("carries over building and unit fields when everything is copied", () => {
    const plan = planFor("all");

    expect(plan.property).toMatchObject({
      name: "Riverbend Apartments",
      street1: "120 King St W",
      city: "Kitchener",
      country: "Canada",
      contactEmail: "dana@example.com",
    });
    expect(plan.listing).toMatchObject({
      description: "Bright corner unit.",
      bedrooms: 2,
      bathrooms: 1.5,
      monthlyRentCents: 185000,
      buildingType: "apartment",
      applicationUrl: "https://example.com/apply",
    });
  });

  it("blanks the unit fields for the building scope", () => {
    const plan = planFor("building");

    expect(plan.property).toMatchObject({ street1: "120 King St W", city: "Kitchener" });
    expect(plan.listing).toMatchObject({
      description: null,
      bedrooms: 0,
      bathrooms: 0,
      squareFeet: null,
      monthlyRentCents: 0,
      leaseTermMonths: null,
      utilitiesIncluded: [],
      maxIncomeCents: null,
      buildingType: "apartment",
      applicationInstructions: "Bring proof of income.",
    });
  });

  it("blanks the building and address fields for the unit scope", () => {
    const plan = planFor("unit");

    expect(plan.property).toMatchObject({
      name: "",
      street1: "",
      street2: null,
      city: "",
      province: "",
      postalCode: "",
      neighborhood: null,
      latitude: null,
      longitude: null,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    });
    expect(plan.listing).toMatchObject({
      description: "Bright corner unit.",
      bedrooms: 2,
      monthlyRentCents: 185000,
      buildingType: null,
      applicationUrl: null,
      applicationEmail: "",
      applicationPhone: "",
      applicationInstructions: null,
    });
  });

  it("falls back to the default country when the building is not copied", () => {
    expect(planFor("unit").property.country).toBe(DEFAULT_PROPERTY_COUNTRY);
    expect(planFor("building").property.country).toBe("Canada");
  });

  it("always resets the copy to an unpublished draft regardless of scope", () => {
    for (const scope of ["all", "building", "unit"] as const) {
      expect(planFor(scope).listing).toMatchObject({
        status: "draft",
        unitNumber: null,
        availableOn: null,
        publishedAt: null,
        archivedAt: null,
      });
    }
  });

  it("keeps the source owner while recording the actor as the editor", () => {
    const plan = planFor("all");

    expect(plan.property.ownerUserId).toBe(OWNER_USER_ID);
    expect(plan.property).toMatchObject({
      createdByUserId: ACTOR_USER_ID,
      updatedByUserId: ACTOR_USER_ID,
    });
    expect(plan.listing).toMatchObject({
      createdByUserId: ACTOR_USER_ID,
      updatedByUserId: ACTOR_USER_ID,
    });
  });
});

describe("buildListingFeatureCategories", () => {
  it("applies alphabetical category order and per-category sort order for custom fields", () => {
    const features = buildListingFeatureCategories(
      // Deliberately the reverse of the expected output so that passing through
      // insertion order cannot be mistaken for sorting.
      {
        unit_beta: true,
        unit_alpha: true,
        building_beta: true,
        building_alpha: true,
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

  it("ignores legacy accessibility arrays when building public feature categories", () => {
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

    expect(features).toEqual([]);
  });
});

describe("buildListingCustomFields", () => {
  it("persists selected feature ids as boolean custom fields", () => {
    const customFields = buildListingCustomFields(
      {
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
        accessibilityFeatures: [
          {
            id: "elevator_in_building",
            name: "Elevator in Building",
            description: "The building has at least one elevator.",
          },
        ],
        applicationUrl: undefined,
        images: [],
        contact: {
          name: "Leasing Office",
          email: "leasing@example.org",
          phone: "519-555-0100",
        },
        status: "draft",
        buildingType: "apartment",
        leaseTermMonths: 12,
        utilitiesIncluded: [],
      },
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

    expect(customFields.elevator_in_building).toBe(true);
    expect(customFields.accessibilityFeatures).toBeUndefined();
  });
});

describe("mergeListingCustomFields", () => {
  it("preserves unmanaged custom fields while replacing selected feature ids", () => {
    const customFields = mergeListingCustomFields(
      {
        accessibilityFeatures: ["Elevator access"],
        amenities: ["Laundry"],
        elevator_in_building: true,
        unrelated_boolean: true,
      } satisfies ListingCustomFields,
      {
        accessibilityFeatures: [
          {
            id: "automated_building_doors",
            name: "Automated Building Doors",
            description: "Common-area doors open automatically.",
          },
        ],
      },
      [
        {
          key: "elevator_in_building",
          label: "Elevator in Building",
          description: "The building has at least one elevator.",
          category: "BUILDING AMENITIES",
          sortOrder: 1,
        },
        {
          key: "automated_building_doors",
          label: "Automated Building Doors",
          description: "Common-area doors open automatically.",
          category: "BUILDING AMENITIES",
          sortOrder: 2,
        },
      ],
    );

    expect(customFields).toEqual({
      accessibilityFeatures: ["Elevator access"],
      amenities: ["Laundry"],
      unrelated_boolean: true,
      automated_building_doors: true,
    });
  });
});

describe("getDisplayAccessibilityFeatures", () => {
  it("uses canonical labels from boolean custom field definitions", () => {
    const features = getDisplayAccessibilityFeatures(
      {
        automated_building_doors: true,
        elevator_in_building: true,
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
  it("returns trimmed applicationUrl when provided", () => {
    expect(getListingApplicationUrl(" https://example.org/apply ")).toBe(
      "https://example.org/apply",
    );
  });

  it("returns undefined when empty", () => {
    expect(getListingApplicationUrl(null)).toBeUndefined();
    expect(getListingApplicationUrl(undefined)).toBeUndefined();
    expect(getListingApplicationUrl("   ")).toBeUndefined();
  });
});
