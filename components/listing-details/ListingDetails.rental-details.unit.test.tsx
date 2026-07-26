import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { ListingDetails } from "./ListingDetails";

const baseProps = {
  price: 1500,
  street1: "123 Main St",
  city: "Waterloo",
  beds: 2,
  baths: 1,
  sqft: 900,
  images: [],
  timeAgo: "2 days ago",
  features: [],
};

describe("ListingDetails rental details", () => {
  it("shows the description, building type, lease term, and available date when provided", () => {
    render(
      <ListingDetails
        {...baseProps}
        description="Bright corner unit near the LRT."
        buildingType="apartment"
        leaseTermMonths={12}
        availableOn="2026-09-01"
      />,
    );

    expect(screen.queryByText("Description")).not.toBeNull();
    expect(screen.queryByText("Bright corner unit near the LRT.")).not.toBeNull();
    expect(screen.queryByText("Building Type")).not.toBeNull();
    expect(screen.queryByText("Apartment")).not.toBeNull();
    expect(screen.queryByText("Lease Term")).not.toBeNull();
    expect(screen.queryByText("12-month lease")).not.toBeNull();
    expect(screen.queryByText("Available")).not.toBeNull();
    expect(screen.queryByText("September 1, 2026")).not.toBeNull();
  });

  it("omits the rows and description section when the fields are missing", () => {
    render(<ListingDetails {...baseProps} />);

    expect(screen.queryByText("Description")).toBeNull();
    expect(screen.queryByText("Building Type")).toBeNull();
    expect(screen.queryByText("Lease Term")).toBeNull();
    expect(screen.queryByText("Available")).toBeNull();
  });

  it("does not render a description section for whitespace-only descriptions", () => {
    render(<ListingDetails {...baseProps} description="   " />);

    expect(screen.queryByText("Description")).toBeNull();
  });

  it("falls back to the raw available date when it cannot be parsed", () => {
    render(<ListingDetails {...baseProps} availableOn="Now" />);

    expect(screen.queryByText("Available")).not.toBeNull();
    expect(screen.queryByText("Now")).not.toBeNull();
  });
});
