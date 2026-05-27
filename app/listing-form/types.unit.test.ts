import { describe, expect, it } from "@jest/globals";
import {
  CREATE_FORM_DEFAULTS,
  listingFormSchema,
  type ListingFormInput,
} from "@/app/listing-form/types";

const validFormInput: ListingFormInput = {
  ...CREATE_FORM_DEFAULTS,
  title: "Accessible Two Bedroom",
  buildingType: "apartment",
  bedrooms: 2,
  bathrooms: 1,
  monthlyRentCents: 185000,
  leaseTerm: 12,
  name: "Cedar Court",
  street1: "123 Main Street",
  city: "Waterloo",
  province: "ON",
  postalCode: "N2L 3A1",
  contactName: "Leasing Office",
  contactEmail: "leasing@example.org",
  contactPhone: "519-555-0100",
};

describe("listingFormSchema", () => {
  it("trims required and optional strings", () => {
    const parsed = listingFormSchema.parse({
      ...validFormInput,
      title: "  Accessible Two Bedroom  ",
      street2: "  Apt 301  ",
      unitNumber: "  301  ",
      contactEmail: "  Leasing@Example.ORG  ",
      applicationUrl: "  https://example.org/apply  ",
    });

    expect(parsed.title).toBe("Accessible Two Bedroom");
    expect(parsed.street2).toBe("Apt 301");
    expect(parsed.unitNumber).toBe("301");
    expect(parsed.contactEmail).toBe("leasing@example.org");
    expect(parsed.applicationUrl).toBe("https://example.org/apply");
  });

  it("normalizes optional blank strings to undefined", () => {
    const parsed = listingFormSchema.parse({
      ...validFormInput,
      description: "   ",
      street2: "   ",
      unitNumber: "   ",
      availableOn: "   ",
      applicationUrl: "   ",
    });

    expect(parsed.description).toBeUndefined();
    expect(parsed.street2).toBeUndefined();
    expect(parsed.unitNumber).toBeUndefined();
    expect(parsed.availableOn).toBeUndefined();
    expect(parsed.applicationUrl).toBeUndefined();
  });

  it("rejects whitespace-only required fields", () => {
    const result = listingFormSchema.safeParse({
      ...validFormInput,
      title: "   ",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected schema parse to fail");
    }

    expect(result.error.issues.some((issue) => issue.path.join(".") === "title")).toBe(true);
  });

  it("accepts root-relative uploaded image URLs", () => {
    const parsed = listingFormSchema.parse({
      ...validFormInput,
      images: [
        {
          id: "ec53dba9-e6c0-491c-9c8c-f63b8fa43c1a",
          url: "/api/image-uploads/ec53dba9-e6c0-491c-9c8c-f63b8fa43c1a",
          caption: "",
        },
      ],
    });

    expect(parsed.images[0]?.url).toBe("/api/image-uploads/ec53dba9-e6c0-491c-9c8c-f63b8fa43c1a");
  });

  it("rejects invalid application URLs", () => {
    const result = listingFormSchema.safeParse({
      ...validFormInput,
      applicationUrl: "not-a-url",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected schema parse to fail");
    }

    expect(result.error.issues.some((issue) => issue.path.join(".") === "applicationUrl")).toBe(
      true,
    );
  });

  it("rejects non-http application URL protocols", () => {
    const result = listingFormSchema.safeParse({
      ...validFormInput,
      applicationUrl: "mailto:leasing@example.org",
    });

    expect(result.success).toBe(false);
  });
});
