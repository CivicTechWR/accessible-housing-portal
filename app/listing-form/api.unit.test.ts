import { describe, expect, it } from "@jest/globals";

import {
  CREATE_FORM_DEFAULTS,
  type ListingFormData,
  type ListingFormInput,
} from "@/app/listing-form/types";
import {
  mapListingFormToAutosaveUpdateInput,
  mapListingFormToCreateListingInput,
  mapListingFormToUpdateListingInput,
} from "@/app/listing-form/api";

const validFormData: ListingFormData = {
  ...CREATE_FORM_DEFAULTS,
  title: "Accessible Two Bedroom",
  propertyType: "Rent",
  buildingType: "Apartment",
  unitStory: 2,
  bedrooms: 2,
  bathrooms: 1.5,
  squareFeet: 920,
  monthlyRentCents: 185000,
  leaseTerm: "1 year",
  availableOn: "2026-05-01",
  status: "draft",
  unitNumber: "204",
  name: "Cedar Court",
  street1: "123 Main Street",
  street2: "Building A",
  city: "Waterloo",
  province: "ON",
  postalCode: "N2L 3A1",
  contactName: "Leasing Office",
  contactEmail: "leasing@example.org",
  contactPhone: "519-555-0100",
  images: [
    {
      id: "6ee785fa-7f75-414f-b6e7-c65fb22083b2",
      url: "https://example.org/listing.jpg",
      caption: "Front exterior",
    },
  ],
  customFeatures: [
    {
      category: "Accessibility",
      id: "ramp_entry",
      name: "Ramp entry",
      description: "Step-free building entry",
    },
  ],
  utilitiesIncluded: ["Heat", "Water"],
};

describe("mapListingFormToCreateListingInput", () => {
  it("maps listing form fields into the create-listing API payload", () => {
    expect(mapListingFormToCreateListingInput(validFormData)).toEqual({
      title: "Accessible Two Bedroom",
      name: "Cedar Court",
      description: undefined,
      address: {
        street: "123 Main Street",
        street2: "Building A",
        city: "Waterloo",
        province: "ON",
        postalCode: "N2L 3A1",
      },
      units: [
        {
          bedrooms: 2,
          bathrooms: 1.5,
          sqft: 920,
          rent: 1850,
          availableDate: "2026-05-01",
        },
      ],
      amenities: [],
      accessibilityFeatures: [
        {
          id: "ramp_entry",
          name: "Ramp entry",
          description: "Step-free building entry",
        },
      ],
      applicationMethod: "internal",
      eligibilityCriteria: {},
      images: [
        {
          id: "6ee785fa-7f75-414f-b6e7-c65fb22083b2",
          caption: "Front exterior",
        },
      ],
      contact: {
        name: "Leasing Office",
        email: "leasing@example.org",
        phone: "519-555-0100",
      },
      status: "draft",
      unitNumber: "204",
      propertyType: "Rent",
      buildingType: "Apartment",
      unitStory: 2,
      leaseTerm: "1 year",
      utilitiesIncluded: ["Heat", "Water"],
    });
  });

  it("falls back to the feature name when a custom feature description is blank", () => {
    expect(
      mapListingFormToCreateListingInput({
        ...validFormData,
        customFeatures: [
          {
            category: "Accessibility",
            id: "ramp_entry",
            name: "Ramp entry",
            description: "   ",
          },
        ],
      }).accessibilityFeatures,
    ).toEqual([
      {
        id: "ramp_entry",
        name: "Ramp entry",
        description: "Ramp entry",
      },
    ]);
  });

  it("provides backend-compatible defaults for missing square footage and availability date", () => {
    const payload = mapListingFormToCreateListingInput({
      ...validFormData,
      squareFeet: undefined,
      availableOn: undefined,
    });

    expect(payload.units).toHaveLength(1);
    expect(payload.units[0]?.sqft).toBe(0);
    expect(payload.units[0]?.availableDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("maps an application URL to the external application payload", () => {
    expect(
      mapListingFormToCreateListingInput({
        ...validFormData,
        applicationUrl: "https://example.org/apply",
      }),
    ).toEqual({
      title: "Accessible Two Bedroom",
      name: "Cedar Court",
      description: undefined,
      address: {
        street: "123 Main Street",
        street2: "Building A",
        city: "Waterloo",
        province: "ON",
        postalCode: "N2L 3A1",
      },
      units: [
        {
          bedrooms: 2,
          bathrooms: 1.5,
          sqft: 920,
          rent: 1850,
          availableDate: "2026-05-01",
        },
      ],
      amenities: [],
      accessibilityFeatures: [
        {
          id: "ramp_entry",
          name: "Ramp entry",
          description: "Step-free building entry",
        },
      ],
      applicationMethod: "external_link",
      externalApplicationUrl: "https://example.org/apply",
      eligibilityCriteria: {},
      images: [
        {
          id: "6ee785fa-7f75-414f-b6e7-c65fb22083b2",
          caption: "Front exterior",
        },
      ],
      contact: {
        name: "Leasing Office",
        email: "leasing@example.org",
        phone: "519-555-0100",
      },
      status: "draft",
      unitNumber: "204",
      propertyType: "Rent",
      buildingType: "Apartment",
      unitStory: 2,
      leaseTerm: "1 year",
      utilitiesIncluded: ["Heat", "Water"],
    });
  });

  it("maps full form submission into an update payload with a published status", () => {
    expect(mapListingFormToUpdateListingInput(validFormData, "published")).toEqual({
      title: "Accessible Two Bedroom",
      name: "Cedar Court",
      description: undefined,
      address: {
        street: "123 Main Street",
        street2: "Building A",
        city: "Waterloo",
        province: "ON",
        postalCode: "N2L 3A1",
      },
      units: [
        {
          bedrooms: 2,
          bathrooms: 1.5,
          sqft: 920,
          rent: 1850,
          availableDate: "2026-05-01",
        },
      ],
      amenities: [],
      accessibilityFeatures: [
        {
          id: "ramp_entry",
          name: "Ramp entry",
          description: "Step-free building entry",
        },
      ],
      images: [
        {
          id: "6ee785fa-7f75-414f-b6e7-c65fb22083b2",
          caption: "Front exterior",
        },
      ],
      contact: {
        name: "Leasing Office",
        email: "leasing@example.org",
        phone: "519-555-0100",
      },
      status: "published",
      unitNumber: "204",
      propertyType: "Rent",
      buildingType: "Apartment",
      unitStory: 2,
      leaseTerm: "1 year",
      utilitiesIncluded: ["Heat", "Water"],
    });
  });

  it("maps application URLs on full updates to the external application method", () => {
    expect(
      mapListingFormToUpdateListingInput(
        {
          ...validFormData,
          applicationUrl: "https://example.org/apply",
        },
        "published",
      ),
    ).toMatchObject({
      applicationMethod: "external_link",
      externalApplicationUrl: "https://example.org/apply",
    });
  });

  it("maps explicitly cleared application URLs on full updates to the internal method", () => {
    expect(
      mapListingFormToUpdateListingInput(
        {
          ...validFormData,
          applicationUrl: undefined,
        },
        "published",
        {
          ...validFormData,
          applicationUrl: "  ",
        },
      ),
    ).toMatchObject({
      applicationMethod: "internal",
    });
  });

  it("builds a partial autosave payload from incomplete draft values", () => {
    const autosaveDraft: ListingFormInput = {
      ...CREATE_FORM_DEFAULTS,
      title: "  Draft title  ",
      bedrooms: 0,
      bathrooms: 1,
      monthlyRentCents: 0,
      images: [
        {
          id: "6ee785fa-7f75-414f-b6e7-c65fb22083b2",
          url: "/api/image-uploads/6ee785fa-7f75-414f-b6e7-c65fb22083b2",
          caption: "",
        },
      ],
    };

    expect(mapListingFormToAutosaveUpdateInput(autosaveDraft)).toEqual({
      title: "Draft title",
      units: [
        {
          bedrooms: 0,
          bathrooms: 1,
          rent: 0,
        },
      ],
      accessibilityFeatures: [],
      images: [
        {
          id: "6ee785fa-7f75-414f-b6e7-c65fb22083b2",
          caption: undefined,
        },
      ],
      status: "draft",
      utilitiesIncluded: [],
    });
  });

  it("marks unit number as null in autosave payloads when the field is explicitly cleared", () => {
    expect(
      mapListingFormToAutosaveUpdateInput({
        ...CREATE_FORM_DEFAULTS,
        title: "Draft title",
        monthlyRentCents: 0,
        unitNumber: "",
      }),
    ).toEqual({
      title: "Draft title",
      accessibilityFeatures: [],
      images: [],
      status: "draft",
      unitNumber: null,
      units: [
        {
          bedrooms: 0,
          bathrooms: 0,
          rent: 0,
        },
      ],
      utilitiesIncluded: [],
    });
  });

  it("omits invalid in-progress contact emails from autosave payloads", () => {
    expect(
      mapListingFormToAutosaveUpdateInput({
        ...CREATE_FORM_DEFAULTS,
        title: "Draft title",
        contactName: "Leasing Office",
        contactEmail: "leasing@",
        contactPhone: "519-555-0100",
        monthlyRentCents: 0,
      }),
    ).toEqual({
      title: "Draft title",
      contact: {
        name: "Leasing Office",
        phone: "519-555-0100",
      },
      accessibilityFeatures: [],
      images: [],
      status: "draft",
      units: [
        {
          bedrooms: 0,
          bathrooms: 0,
          rent: 0,
        },
      ],
      utilitiesIncluded: [],
    });
  });

  it("maps valid application URLs in autosave payloads", () => {
    expect(
      mapListingFormToAutosaveUpdateInput({
        ...CREATE_FORM_DEFAULTS,
        title: "Draft title",
        applicationUrl: "https://example.org/apply",
        monthlyRentCents: 0,
      }),
    ).toEqual({
      title: "Draft title",
      applicationMethod: "external_link",
      externalApplicationUrl: "https://example.org/apply",
      accessibilityFeatures: [],
      images: [],
      status: "draft",
      units: [
        {
          bedrooms: 0,
          bathrooms: 0,
          rent: 0,
        },
      ],
      utilitiesIncluded: [],
    });
  });

  it("clears application URLs in autosave payloads when the field is emptied", () => {
    expect(
      mapListingFormToAutosaveUpdateInput({
        ...CREATE_FORM_DEFAULTS,
        title: "Draft title",
        applicationUrl: "",
        monthlyRentCents: 0,
      }),
    ).toEqual({
      title: "Draft title",
      applicationMethod: "internal",
      accessibilityFeatures: [],
      images: [],
      status: "draft",
      units: [
        {
          bedrooms: 0,
          bathrooms: 0,
          rent: 0,
        },
      ],
      utilitiesIncluded: [],
    });
  });

  it("preserves explicit unit number clearing on publish updates", () => {
    const rawInput: ListingFormInput = {
      ...validFormData,
      unitNumber: "   ",
    };

    expect(
      mapListingFormToUpdateListingInput(
        {
          ...validFormData,
          unitNumber: undefined,
        },
        "published",
        rawInput,
      ),
    ).toEqual({
      title: "Accessible Two Bedroom",
      name: "Cedar Court",
      description: undefined,
      address: {
        street: "123 Main Street",
        street2: "Building A",
        city: "Waterloo",
        province: "ON",
        postalCode: "N2L 3A1",
      },
      units: [
        {
          bedrooms: 2,
          bathrooms: 1.5,
          sqft: 920,
          rent: 1850,
          availableDate: "2026-05-01",
        },
      ],
      amenities: [],
      accessibilityFeatures: [
        {
          id: "ramp_entry",
          name: "Ramp entry",
          description: "Step-free building entry",
        },
      ],
      images: [
        {
          id: "6ee785fa-7f75-414f-b6e7-c65fb22083b2",
          caption: "Front exterior",
        },
      ],
      contact: {
        name: "Leasing Office",
        email: "leasing@example.org",
        phone: "519-555-0100",
      },
      status: "published",
      unitNumber: null,
      propertyType: "Rent",
      buildingType: "Apartment",
      unitStory: 2,
      leaseTerm: "1 year",
      utilitiesIncluded: ["Heat", "Water"],
    });
  });
});
