import { describe, expect, it } from "@jest/globals";

import {
  CREATE_FORM_DEFAULTS,
  type ListingFormData,
  type ListingFormInput,
} from "@/app/listing-form/types";
import {
  getPendingAutosaveNullableFieldClearIntent,
  mapListingFormToAutosavePatchInput,
  mapListingFormToCreateListingInput,
  mapListingFormToReplaceListingInput,
} from "@/app/listing-form/api";

const validFormData: ListingFormData = {
  ...CREATE_FORM_DEFAULTS,
  title: "Accessible Two Bedroom",
  buildingType: "apartment",
  bedrooms: 2,
  bathrooms: 1.5,
  squareFeet: 920,
  monthlyRentCents: 185000,
  leaseTerm: 12,
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
  utilitiesIncluded: ["heat", "water"],
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
      accessibilityFeatures: [
        {
          id: "ramp_entry",
          name: "Ramp entry",
          description: "Step-free building entry",
        },
      ],
      applicationUrl: undefined,
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
      buildingType: "apartment",
      leaseTermMonths: 12,
      utilitiesIncluded: ["heat", "water"],
      depositInfo: undefined,
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

  it("maps an application URL to the create payload", () => {
    expect(
      mapListingFormToCreateListingInput({
        ...validFormData,
        applicationUrl: "https://example.org/apply",
      }),
    ).toMatchObject({
      applicationUrl: "https://example.org/apply",
    });
  });

  it("maps full form submission into a replacement payload with a published status", () => {
    expect(mapListingFormToReplaceListingInput(validFormData, "published")).toEqual({
      title: "Accessible Two Bedroom",
      name: "Cedar Court",
      description: null,
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
      applicationUrl: null,
      buildingType: "apartment",
      leaseTermMonths: 12,
      utilitiesIncluded: ["heat", "water"],
      depositInfo: null,
    });
  });

  it("maps application URLs on full replacements", () => {
    expect(
      mapListingFormToReplaceListingInput(
        {
          ...validFormData,
          applicationUrl: "https://example.org/apply",
        },
        "published",
      ),
    ).toMatchObject({
      applicationUrl: "https://example.org/apply",
    });
  });

  it("maps explicitly cleared application URLs on full replacements to null", () => {
    expect(
      mapListingFormToReplaceListingInput(
        {
          ...validFormData,
          applicationUrl: undefined,
        },
        "published",
      ),
    ).toMatchObject({
      applicationUrl: null,
    });
  });

  it("maps deposit information on create, replace, and autosave payloads", () => {
    const withDeposit = {
      ...validFormData,
      depositInfo: "First and last month's rent, refundable",
    };

    expect(mapListingFormToCreateListingInput(withDeposit)).toMatchObject({
      depositInfo: "First and last month's rent, refundable",
    });
    expect(mapListingFormToReplaceListingInput(withDeposit, "published")).toMatchObject({
      depositInfo: "First and last month's rent, refundable",
    });
    expect(
      mapListingFormToAutosavePatchInput({
        ...CREATE_FORM_DEFAULTS,
        title: "Draft title",
        depositInfo: "  Last month's rent  ",
        monthlyRentCents: 0,
      }),
    ).toMatchObject({
      depositInfo: "Last month's rent",
    });
  });

  it("maps explicitly cleared deposit information on full replacements to null", () => {
    expect(
      mapListingFormToReplaceListingInput(
        {
          ...validFormData,
          depositInfo: undefined,
        },
        "published",
      ),
    ).toMatchObject({
      depositInfo: null,
    });
  });

  it("clears deposit information in autosave payloads when the field is emptied", () => {
    expect(
      mapListingFormToAutosavePatchInput({
        ...CREATE_FORM_DEFAULTS,
        title: "Draft title",
        depositInfo: "",
        monthlyRentCents: 0,
      }),
    ).toMatchObject({
      depositInfo: null,
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

    expect(mapListingFormToAutosavePatchInput(autosaveDraft)).toEqual({
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

  it("keeps a nullable clear pending until null has been autosaved", () => {
    const populatedDraft: ListingFormInput = {
      ...CREATE_FORM_DEFAULTS,
      description: "Saved description",
      street2: "Suite 204",
      squareFeet: 920,
      monthlyRentCents: 0,
    };
    const lastAutosavedPayload = mapListingFormToAutosavePatchInput(populatedDraft);

    expect(lastAutosavedPayload).not.toBeNull();

    const clearedDraft: ListingFormInput = {
      ...CREATE_FORM_DEFAULTS,
      description: "",
      street2: "",
      squareFeet: undefined,
      monthlyRentCents: 0,
    };
    const pendingClearIntent = getPendingAutosaveNullableFieldClearIntent(
      clearedDraft,
      lastAutosavedPayload,
    );

    expect(pendingClearIntent).toEqual({
      description: true,
      street2: true,
      squareFeet: true,
    });

    const clearedPayload = mapListingFormToAutosavePatchInput(
      clearedDraft,
      "draft",
      pendingClearIntent,
    );

    expect(clearedPayload?.description).toBeNull();
    expect(clearedPayload?.address?.street2).toBeNull();
    expect(clearedPayload?.units?.[0]?.sqft).toBeNull();
    expect(getPendingAutosaveNullableFieldClearIntent(clearedDraft, clearedPayload)).toEqual({
      description: false,
      street2: false,
      squareFeet: false,
    });
  });

  it("marks unit number as null in autosave payloads when the field is explicitly cleared", () => {
    expect(
      mapListingFormToAutosavePatchInput({
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
      mapListingFormToAutosavePatchInput({
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
      mapListingFormToAutosavePatchInput({
        ...CREATE_FORM_DEFAULTS,
        title: "Draft title",
        applicationUrl: "https://example.org/apply",
        monthlyRentCents: 0,
      }),
    ).toEqual({
      title: "Draft title",
      applicationUrl: "https://example.org/apply",
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
      mapListingFormToAutosavePatchInput({
        ...CREATE_FORM_DEFAULTS,
        title: "Draft title",
        applicationUrl: "",
        monthlyRentCents: 0,
      }),
    ).toEqual({
      title: "Draft title",
      applicationUrl: null,
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

  it("clears application URLs in autosave payloads when the field is invalid", () => {
    expect(
      mapListingFormToAutosavePatchInput({
        ...CREATE_FORM_DEFAULTS,
        title: "Draft title",
        applicationUrl: "https://",
        monthlyRentCents: 0,
      }),
    ).toEqual({
      title: "Draft title",
      applicationUrl: null,
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

  it("maps missing unit numbers to null on publish replacements", () => {
    expect(
      mapListingFormToReplaceListingInput(
        {
          ...validFormData,
          unitNumber: undefined,
        },
        "published",
      ),
    ).toMatchObject({
      status: "published",
      unitNumber: null,
    });
  });
});
