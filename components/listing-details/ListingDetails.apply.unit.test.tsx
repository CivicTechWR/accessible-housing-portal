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
    expect(screen.getByText("Property manager")).toBeTruthy();
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

    expect(screen.getByRole("heading", { name: "Contact and applications" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "apply@example.org" }).getAttribute("href")).toBe(
      "mailto:apply@example.org",
    );
    expect(screen.getByRole("link", { name: "519-555-0111" }).getAttribute("href")).toBe(
      "tel:519-555-0111",
    );
    expect(
      screen.getByText(/Apply directly with the housing lister, outside this portal/),
    ).toBeTruthy();
    expect(screen.getByText(/We reply within two business days/).textContent).toBe(
      "Email to book a viewing.\nWe reply within two business days.",
    );
    expect(screen.queryByText(/hasn't provided contact or application details/)).toBeNull();
  });

  it("renders instructions even when they are the only application details", () => {
    render(<ListingDetails {...baseProps} applicationInstructions="Visit the office to apply." />);

    expect(screen.getByText("Visit the office to apply.")).toBeTruthy();
    expect(screen.getByText("From the housing lister")).toBeTruthy();
    expect(screen.queryByText(/hasn't provided contact or application details/)).toBeNull();
  });

  it("omits additional information when the lister has not supplied it", () => {
    render(<ListingDetails {...baseProps} applicationPhone="519-555-0111" />);

    expect(screen.queryByText("Additional application information")).toBeNull();
    expect(screen.getByRole("link", { name: "519-555-0111" })).toBeTruthy();
    expect(screen.queryByText("Contact the lister to ask how to apply.")).toBeNull();
  });

  it("tells searchers to contact the lister when there are no application methods", () => {
    render(<ListingDetails {...baseProps} {...contactProps} />);

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(screen.queryByText("Contact the lister to ask how to apply.")).not.toBeNull();
    expect(screen.queryByText("Alex Morgan")).not.toBeNull();
  });

  it("shows shared contact methods once despite email case and phone formatting differences", () => {
    render(
      <ListingDetails
        {...baseProps}
        {...contactProps}
        applicationEmail="ALEX@example.org"
        applicationPhone="(519) 555-0100"
      />,
    );

    expect(screen.getByRole("heading", { name: "For questions and applications" })).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: contactProps.contactEmail })).toBeTruthy();
    expect(screen.getByRole("link", { name: contactProps.contactPhone })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Applications" })).toBeNull();
  });

  it.each([
    {
      applicationEmail: contactProps.contactEmail,
      applicationPhone: "519-555-0111",
      different: "519-555-0111",
    },
    {
      applicationEmail: "apply@example.org",
      applicationPhone: contactProps.contactPhone,
      different: "apply@example.org",
    },
  ])(
    "retains the distinct application method and labels the shared one: $different",
    (application) => {
      render(<ListingDetails {...baseProps} {...contactProps} {...application} />);

      expect(screen.getAllByRole("link")).toHaveLength(3);
      expect(screen.getByRole("heading", { name: "Applications" })).toBeTruthy();
      expect(screen.getByRole("link", { name: application.different })).toBeTruthy();
      expect(screen.getByText("Also for applications")).toBeTruthy();
      expect(screen.queryByRole("heading", { name: "For questions and applications" })).toBeNull();
    },
  );

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
