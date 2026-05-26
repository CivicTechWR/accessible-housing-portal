import { describe, expect, it } from "@jest/globals";
import {
  createListingSchema,
  listingEditorDataSchema,
  listingQuerySchema,
  updateListingSchema,
} from "@/shared/schemas/listings";

const validCreatePayload = {
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
  units: [
    {
      bedrooms: 2,
      bathrooms: 1,
      sqft: 900,
      rent: 1850,
      availableDate: "2026-05-01",
    },
  ],
  accessibilityFeatures: [{ name: "Ramp entry", description: "Step-free building entry" }],
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
};

describe("listing API schemas", () => {
  it("accepts maxRent query values with up to two decimal places", () => {
    const result = listingQuerySchema.safeParse({
      maxRent: "1200.50",
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error("Expected query schema parse to succeed");
    }

    expect(result.data.maxRent).toBe("1200.50");
  });

  it("rejects maxRent query values with invalid numeric formats", () => {
    const invalidValues = ["1200.555", "not-a-number"];

    invalidValues.forEach((maxRent) => {
      const result = listingQuerySchema.safeParse({
        maxRent,
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.join(".") === "maxRent")).toBe(true);
      }
    });
  });

  it("trims create payload strings", () => {
    const parsed = createListingSchema.parse({
      ...validCreatePayload,
      title: "  Suite 204 at Cedar Court  ",
      name: "  Cedar Court  ",
      applicationUrl: "  https://example.org/apply  ",
      contact: {
        ...validCreatePayload.contact,
        email: "  leasing@example.org  ",
      },
    });

    expect(parsed.title).toBe("Suite 204 at Cedar Court");
    expect(parsed.name).toBe("Cedar Court");
    expect(parsed.applicationUrl).toBe("https://example.org/apply");
    expect(parsed.contact.email).toBe("leasing@example.org");
  });

  it("rejects whitespace-only required fields in create payloads", () => {
    const result = createListingSchema.safeParse({
      ...validCreatePayload,
      title: "   ",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected schema parse to fail");
    }

    expect(result.error.issues.some((issue) => issue.path.join(".") === "title")).toBe(true);
  });

  it("trims values for partial updates and still validates", () => {
    const parsed = updateListingSchema.parse({
      name: "  Updated Listing Name  ",
    });

    expect(parsed.name).toBe("Updated Listing Name");
  });

  it("rejects effectively empty nested updates", () => {
    const cases = [
      { payload: { address: {} }, message: "Address update must include at least one field." },
      { payload: { contact: {} }, message: "Contact update must include at least one field." },
      { payload: { units: [{}] }, message: "Each unit update must include at least one field." },
    ];

    cases.forEach(({ payload, message }) => {
      const result = updateListingSchema.safeParse(payload);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(message);
      }
    });
  });

  it("accepts meaningful nested updates", () => {
    const result = updateListingSchema.safeParse({
      title: "Updated Title",
      address: { city: "Waterloo" },
      contact: { email: "Leasing@Example.com" },
      units: [{ rent: 1800 }],
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error("Expected schema parse to succeed");
    }

    expect(result.data.contact?.email).toBe("leasing@example.com");
  });

  it("allows clearing unit number in partial updates", () => {
    const result = updateListingSchema.safeParse({
      unitNumber: null,
    });

    expect(result.success).toBe(true);
  });

  it("allows optional create fields to be omitted when the form leaves them blank", () => {
    const result = createListingSchema.safeParse({
      ...validCreatePayload,
      description: undefined,
      unitNumber: undefined,
      images: [],
      units: [
        {
          bedrooms: 2,
          bathrooms: 1,
          rent: 1850,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-http application URLs", () => {
    const result = createListingSchema.safeParse({
      ...validCreatePayload,
      applicationUrl: "mailto:leasing@example.org",
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-http application URLs in listing editor data", () => {
    const result = listingEditorDataSchema.safeParse({
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
    });

    expect(result.success).toBe(false);
  });
});
