import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { CREATE_FORM_DEFAULTS } from "@/app/listing-form/types";
import { ListingFormPreview } from "./ListingFormPreview";

describe("ListingFormPreview card", () => {
  it("shows the address with the city once, like the search results card", () => {
    render(
      <ListingFormPreview
        mode="card"
        formData={{
          ...CREATE_FORM_DEFAULTS,
          street1: "88 Courtland Ave E",
          street2: "Rear entrance",
          unitNumber: "4",
          city: "Kitchener",
          postalCode: "N2G 2T8",
        }}
        onOpenDetails={() => {}}
        onCloseDetails={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "88 Courtland Ave E #4, Kitchener",
    );
  });

  it("loads an uploaded photo directly, since the listing may be a draft only the owner can see", () => {
    const photoUrl = "/api/image-uploads/0b7f2a64-3c8e-4d1a-9f5b-2e6c1d8a4b90";
    render(
      <ListingFormPreview
        mode="card"
        formData={{
          ...CREATE_FORM_DEFAULTS,
          street1: "88 Courtland Ave E",
          images: [{ id: "0b7f2a64-3c8e-4d1a-9f5b-2e6c1d8a4b90", url: photoUrl, caption: "" }],
        }}
        onOpenDetails={() => {}}
        onCloseDetails={() => {}}
      />,
    );

    expect(screen.getByRole("img").getAttribute("src")).toBe(photoUrl);
  });
});
