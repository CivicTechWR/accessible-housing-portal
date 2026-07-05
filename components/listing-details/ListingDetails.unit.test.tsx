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

describe("ListingDetails", () => {
  it("renders the included utilities as a readable list", () => {
    render(<ListingDetails {...baseProps} utilitiesIncluded={["heat", "water", "internet"]} />);

    expect(screen.queryByText("Utilities Included")).not.toBeNull();
    expect(screen.queryByText("Heat, Water, Internet")).not.toBeNull();
  });

  it("shows an explicit empty state when no utilities are included", () => {
    render(<ListingDetails {...baseProps} utilitiesIncluded={[]} />);

    expect(screen.queryByText("Utilities Included")).not.toBeNull();
    expect(screen.queryByText("None listed")).not.toBeNull();
  });

  it("shows the empty state when utilities data is missing", () => {
    render(<ListingDetails {...baseProps} />);

    expect(screen.queryByText("None listed")).not.toBeNull();
  });
});
