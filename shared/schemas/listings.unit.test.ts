import { describe, expect, it } from "@jest/globals";
import {
  listingEditorResponseSchema,
  listingQuerySchema,
  patchListingSchema,
  replaceListingSchema,
} from "@/shared/schemas/listings";
import { expectIssueAt } from "@/test/expect-issue-at";

const validReplacePayload = {
  title: "Suite 204 at Cedar Court",
  name: "Cedar Court",
  description: "Affordable and accessible units in Waterloo.",
  address: {
    street: "123 Main Street",
    street2: "Building A",
    city: "Waterloo",
    province: "ON",
    postalCode: "N2L 3A1",
  },
  unit: {
    bedrooms: 2,
    bathrooms: 1,
    sqft: 900,
    rent: 1850,
    availableDate: "2026-05-01",
  },
  accessibilityFeatureIds: ["ramp_entry"],
  applicationUrl: "https://example.org/apply",
  images: [{ id: "6ee785fa-7f75-414f-b6e7-c65fb22083b2", caption: "Front exterior" }],
  contact: {
    name: "Leasing Office",
    email: "leasing@example.org",
    phone: "519-555-0100",
  },
  status: "draft" as const,
  unitNumber: "204",
  buildingType: "apartment",
  leaseTermMonths: 12,
  utilitiesIncluded: ["heat"],
  heatingType: "heat_pump",
  depositInfo: "First and last month's rent, refundable",
};

describe("listing API schemas", () => {
  it("accepts maxPrice query values with up to two decimal places", () => {
    expect(listingQuerySchema.parse({ maxPrice: "1200.50" }).maxPrice).toBe("1200.50");
    for (const maxPrice of ["1200.555", "not-a-number"]) {
      expectIssueAt(listingQuerySchema.safeParse({ maxPrice }), "maxPrice");
    }
  });

  it("trims replacement and PATCH payload strings", () => {
    const parsed = replaceListingSchema.parse({
      ...validReplacePayload,
      title: "  Suite 204 at Cedar Court  ",
      name: "  Cedar Court  ",
      applicationUrl: "  https://example.org/apply  ",
      depositInfo: "  First and last month's rent  ",
      contact: {
        ...validReplacePayload.contact,
        email: "  leasing@example.org  ",
        role: "  Property manager  ",
      },
    });

    expect(parsed).toMatchObject({
      title: "Suite 204 at Cedar Court",
      name: "Cedar Court",
      applicationUrl: "https://example.org/apply",
      depositInfo: "First and last month's rent",
      contact: { role: "Property manager", email: "leasing@example.org" },
    });
    expect(patchListingSchema.parse({ name: "  Updated Listing Name  " }).name).toBe(
      "Updated Listing Name",
    );
  });

  it("rejects whitespace-only required fields in replacement payloads", () => {
    expectIssueAt(
      replaceListingSchema.safeParse({ ...validReplacePayload, title: "   " }),
      "title",
    );
  });

  it.each([
    { payload: { address: {} }, message: "Address update must include at least one field." },
    { payload: { contact: {} }, message: "Contact update must include at least one field." },
    { payload: { unit: {} }, message: "Unit update must include at least one field." },
  ])("rejects an effectively empty nested PATCH payload: $message", ({ payload, message }) => {
    const result = patchListingSchema.safeParse(payload);

    expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
  });

  it("accepts meaningful nested PATCH payloads", () => {
    const parsed = patchListingSchema.parse({
      title: "Updated Title",
      address: { city: "Waterloo" },
      contact: { email: "Leasing@Example.com" },
      unit: { rent: 1800 },
      accessibilityFeatureIds: ["elevator_in_building"],
    });

    expect(parsed.contact?.email).toBe("leasing@example.com");
  });

  it("accepts explicit null for nullable replacement and PATCH fields", () => {
    const nullableFields = {
      ...validReplacePayload,
      description: null,
      address: {
        ...validReplacePayload.address,
        street2: null,
      },
      unit: {
        ...validReplacePayload.unit,
        sqft: null,
        availableDate: null,
      },
      unitNumber: null,
      heatingType: null,
      depositInfo: null,
      applicationUrl: null,
    };

    expect(replaceListingSchema.safeParse(nullableFields).success).toBe(true);
    expect(
      patchListingSchema.safeParse({
        description: null,
        address: { street2: null },
        unit: { sqft: null, availableDate: null },
        unitNumber: null,
        depositInfo: null,
      }).success,
    ).toBe(true);
  });

  it("keeps replacement and PATCH payload completeness distinct", () => {
    const { description: _description, ...withoutDescription } = validReplacePayload;
    const withoutSquareFeet = {
      ...validReplacePayload,
      unit: { ...validReplacePayload.unit, sqft: undefined },
    };

    expect(patchListingSchema.safeParse({ status: "published" }).success).toBe(true);
    expect(patchListingSchema.safeParse({}).success).toBe(false);
    expect(replaceListingSchema.safeParse(validReplacePayload).success).toBe(true);
    expect(replaceListingSchema.safeParse(withoutDescription).success).toBe(false);
    expect(replaceListingSchema.safeParse(withoutSquareFeet).success).toBe(false);
    expect(replaceListingSchema.safeParse({ status: "published" }).success).toBe(false);
  });

  it("rejects non-http application URLs", () => {
    const result = replaceListingSchema.safeParse({
      ...validReplacePayload,
      applicationUrl: "mailto:leasing@example.org",
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-http application URLs in listing editor responses", () => {
    const result = listingEditorResponseSchema.safeParse({
      data: {
        id: "6ee785fa-7f75-414f-b6e7-c65fb22083b2",
        title: "",
        buildingType: "",
        bedrooms: 0,
        bathrooms: 0,
        monthlyRentCents: 0,
        utilitiesIncluded: [],
        images: [],
        status: "draft",
        name: "",
        street1: "",
        city: "",
        province: "",
        postalCode: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        applicationUrl: "mailto:leasing@example.org",
        customFeatures: [],
      },
    });

    expectIssueAt(result, "data.applicationUrl");
  });
});

describe("contact role updates", () => {
  it("accepts an omitted role and explicit clearing, but rejects non-text roles", () => {
    expect(replaceListingSchema.parse(validReplacePayload).contact.role).toBeUndefined();
    expect(patchListingSchema.parse({ contact: { role: null } }).contact?.role).toBeNull();
    expect(patchListingSchema.safeParse({ contact: { role: 123 } }).success).toBe(false);
  });
});

describe("application details validation", () => {
  it("accepts and normalizes application details separately from the property contact", () => {
    const parsed = replaceListingSchema.parse({
      ...validReplacePayload,
      applicationEmail: "  Apply@Example.ORG  ",
      applicationPhone: "  519-555-0111  ",
      applicationInstructions: "  Call for a viewing.\nReplies within two business days.  ",
    });
    expect(parsed).toMatchObject({
      applicationEmail: "apply@example.org",
      applicationPhone: "519-555-0111",
      applicationInstructions: "Call for a viewing.\nReplies within two business days.",
      contact: { email: "leasing@example.org" },
    });
    expect(
      patchListingSchema.parse({
        applicationEmail: null,
        applicationPhone: null,
        applicationInstructions: null,
      }),
    ).toEqual({ applicationEmail: null, applicationPhone: null, applicationInstructions: null });
  });

  it("rejects invalid application emails at both write endpoints", () => {
    expect(
      replaceListingSchema.safeParse({ ...validReplacePayload, applicationEmail: "apply@" })
        .success,
    ).toBe(false);
    expect(patchListingSchema.safeParse({ applicationEmail: "apply@" }).success).toBe(false);
  });
});

describe("listing heating type contracts", () => {
  it("requires a heating value or null on replacement", () => {
    const { heatingType: _heatingType, ...withoutHeating } = validReplacePayload;
    expect(replaceListingSchema.safeParse(withoutHeating).success).toBe(false);
    expect(replaceListingSchema.safeParse({ ...withoutHeating, heatingType: null }).success).toBe(
      true,
    );
  });

  it("accepts an explicit unknown or clear and rejects arbitrary heating values", () => {
    expect(patchListingSchema.parse({ heatingType: "unknown" }).heatingType).toBe("unknown");
    expect(patchListingSchema.parse({ heatingType: null }).heatingType).toBeNull();
    expect(patchListingSchema.safeParse({ heatingType: "radiators" }).success).toBe(false);
  });
});
