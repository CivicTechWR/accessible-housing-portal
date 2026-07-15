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

const contactProps = {
  contactName: "Alex Morgan",
  contactEmail: "alex@example.org",
  contactPhone: "519-555-0100",
};

describe("ListingDetails apply section", () => {
  it("shows the apply button when the listing has an application URL", () => {
    render(
      <ListingDetails
        {...baseProps}
        {...contactProps}
        applicationUrl="https://example.org/apply"
      />,
    );

    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeNull();
  });

  it("tells searchers to contact the lister when there is no application URL", () => {
    render(<ListingDetails {...baseProps} {...contactProps} />);

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(
      screen.queryByText("No online application — contact the lister directly to apply."),
    ).not.toBeNull();
    expect(screen.queryByText("Alex Morgan")).not.toBeNull();
  });

  it("explains when the lister has provided no contact or application details", () => {
    render(<ListingDetails {...baseProps} />);

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(
      screen.queryByText(
        "The lister hasn't provided contact or application details for this listing yet. Please check back later.",
      ),
    ).not.toBeNull();
  });
});
