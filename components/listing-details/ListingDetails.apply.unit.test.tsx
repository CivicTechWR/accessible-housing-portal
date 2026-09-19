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
        contactRole="Property manager"
        applicationUrl="https://example.org/apply"
      />,
    );

    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Property manager" })).toBeTruthy();
  });

  it("shows application contacts without requiring general contact info", () => {
    render(
      <ListingDetails
        {...baseProps}
        applicationEmail="apply@example.org"
        applicationPhone="519-555-0111"
        applicationInstructions={"Email to book a viewing.\nWe reply within two business days."}
      />,
    );

    expect(screen.getByText("How to apply")).toBeTruthy();
    expect(screen.getByRole("link", { name: "apply@example.org" }).getAttribute("href")).toBe(
      "mailto:apply@example.org",
    );
    expect(screen.getByRole("link", { name: "519-555-0111" }).getAttribute("href")).toBe(
      "tel:519-555-0111",
    );
    expect(screen.getByText(/Applications happen outside the portal/)).toBeTruthy();
    expect(screen.getByText(/We reply within two business days/).textContent).toBe(
      "Email to book a viewing.\nWe reply within two business days.",
    );
    expect(screen.queryByText(/hasn't provided contact or application details/)).toBeNull();
  });

  it("renders instructions even when they are the only application details", () => {
    render(<ListingDetails {...baseProps} applicationInstructions="Visit the office to apply." />);

    expect(screen.getByText("Visit the office to apply.")).toBeTruthy();
    expect(screen.queryByText(/hasn't provided contact or application details/)).toBeNull();
  });

  it("identifies missing next steps without promising a response time", () => {
    render(<ListingDetails {...baseProps} applicationPhone="519-555-0111" />);

    expect(
      screen.getByText(/hasn't provided viewing arrangements or an expected response time/),
    ).toBeTruthy();
    expect(screen.queryByText(/Contact Info above/)).toBeNull();
  });

  it("tells searchers to contact the lister when there is no application URL", () => {
    render(<ListingDetails {...baseProps} {...contactProps} />);

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(
      screen.queryByText(
        "No online application. Contact the lister using the Contact Info above to apply.",
      ),
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
