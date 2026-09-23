import { describe, expect, it } from "@jest/globals";
import {
  CREATE_FORM_DEFAULTS,
  listingFormSchema,
  type ListingFormInput,
} from "@/app/listing-form/types";
import { expectIssueAt } from "@/test/expect-issue-at";

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
      contactRole: "  Property manager  ",
      applicationUrl: "  https://example.org/apply  ",
      depositInfo: "  First and last month's rent  ",
      applicationEmail: "  Apply@Example.ORG  ",
      applicationPhone: "  519-555-0111  ",
      applicationInstructions: "  Email to book a viewing.\nReplies within two business days.  ",
    });

    expect(parsed).toMatchObject({
      title: "Accessible Two Bedroom",
      street2: "Apt 301",
      unitNumber: "301",
      contactRole: "Property manager",
      contactEmail: "leasing@example.org",
      applicationUrl: "https://example.org/apply",
      depositInfo: "First and last month's rent",
      applicationEmail: "apply@example.org",
      applicationPhone: "519-555-0111",
      applicationInstructions: "Email to book a viewing.\nReplies within two business days.",
    });
  });

  it("normalizes optional blank strings to undefined", () => {
    const optionalFields = [
      "description",
      "contactRole",
      "street2",
      "unitNumber",
      "availableOn",
      "applicationUrl",
      "depositInfo",
      "applicationEmail",
      "applicationPhone",
      "applicationInstructions",
    ] as const;
    const parsed = listingFormSchema.parse({
      ...validFormInput,
      ...Object.fromEntries(optionalFields.map((key) => [key, "   "])),
    });

    for (const key of optionalFields) {
      expect(parsed[key]).toBeUndefined();
    }
  });

  it("rejects whitespace-only required fields", () => {
    expectIssueAt(listingFormSchema.safeParse({ ...validFormInput, title: "   " }), "title");
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

  it("rejects application URLs that are malformed or not http(s)", () => {
    for (const applicationUrl of ["not-a-url", "mailto:leasing@example.org"]) {
      expectIssueAt(
        listingFormSchema.safeParse({ ...validFormInput, applicationUrl }),
        "applicationUrl",
      );
    }
  });
});
