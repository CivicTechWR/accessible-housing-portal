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

const NO_DETAILS_MESSAGE = /hasn't provided contact or application details/;

describe("ListingDetails rental details", () => {
  it("renders the included utilities in a consistent order", () => {
    render(<ListingDetails {...baseProps} utilitiesIncluded={["internet", "water", "heat"]} />);

    screen.getByText("Utilities Included");
    screen.getByText("Heat, Water, Internet");
  });

  it("shows an explicit empty state when no utilities are included", () => {
    render(<ListingDetails {...baseProps} utilitiesIncluded={[]} />);

    screen.getByText("Utilities Included");
    screen.getByText("None listed");
  });

  it("shows the optional rental details in order when provided", () => {
    render(
      <ListingDetails
        {...baseProps}
        description="Bright corner unit near the LRT."
        buildingType="apartment"
        heatingType="heat_pump"
        utilitiesIncluded={["water"]}
        leaseTermMonths={12}
        availableOn="2026-09-01"
        depositInfo="First and last month's rent, refundable"
      />,
    );

    for (const text of [
      "Description",
      "Bright corner unit near the LRT.",
      "Building Type",
      "Apartment",
      "Deposit",
      "First and last month's rent, refundable",
      "Electric heat pump",
      "Water",
      "Initial Lease Term",
      "12-month lease",
      "Available",
      "September 1, 2026",
    ]) {
      screen.getByText(text);
    }
    const labels = screen.getAllByRole("term").map((node) => node.textContent);
    expect(labels.indexOf("Deposit")).toBeLessThan(labels.indexOf("Rental Cost"));
    expect(labels.indexOf("Primary heating type") + 1).toBe(labels.indexOf("Utilities Included"));
  });

  it("omits the optional rows and a whitespace-only description", () => {
    render(<ListingDetails {...baseProps} description="   " />);

    for (const label of [
      "Description",
      "Building Type",
      "Primary heating type",
      "Initial Lease Term",
      "Available",
      "Deposit",
    ]) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it("preserves line breaks in deposit information", () => {
    render(
      <ListingDetails
        {...baseProps}
        depositInfo={"First and last month's rent\nRefundable key deposit"}
      />,
    );

    const depositValue = screen.getByText(/First and last month's rent/);
    expect(depositValue.textContent).toBe("First and last month's rent\nRefundable key deposit");
    expect(depositValue).toHaveClass("whitespace-pre-line");
  });
});

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

    screen.getByRole("button", { name: "Apply" });
    screen.getByText("Property manager");
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

    screen.getByRole("heading", { name: "Contact and applications" });
    expect(screen.getByRole("link", { name: "apply@example.org" })).toHaveAttribute(
      "href",
      "mailto:apply@example.org",
    );
    expect(screen.getByRole("link", { name: "519-555-0111" })).toHaveAttribute(
      "href",
      "tel:519-555-0111",
    );
    screen.getByText(/Apply directly with the housing lister, outside this portal/);
    expect(screen.getByText(/We reply within two business days/).textContent).toBe(
      "Email to book a viewing.\nWe reply within two business days.",
    );
    expect(screen.queryByText(NO_DETAILS_MESSAGE)).toBeNull();
  });

  it("renders instructions even when they are the only application details", () => {
    render(<ListingDetails {...baseProps} applicationInstructions="Visit the office to apply." />);

    screen.getByText("Visit the office to apply.");
    screen.getByText("From the housing lister");
    expect(screen.queryByText(NO_DETAILS_MESSAGE)).toBeNull();
  });

  it("omits additional information when the lister has not supplied it", () => {
    render(<ListingDetails {...baseProps} applicationPhone="519-555-0111" />);

    screen.getByRole("link", { name: "519-555-0111" });
    expect(screen.queryByText("Additional application information")).toBeNull();
    expect(screen.queryByText("Contact the lister to ask how to apply.")).toBeNull();
  });

  it("tells searchers to contact the lister when there are no application methods", () => {
    render(<ListingDetails {...baseProps} {...contactProps} />);

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    screen.getByText("Contact the lister to ask how to apply.");
    screen.getByText("Alex Morgan");
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

    screen.getByRole("heading", { name: "For questions and applications" });
    expect(screen.getAllByRole("link")).toHaveLength(2);
    screen.getByRole("link", { name: contactProps.contactEmail });
    screen.getByRole("link", { name: contactProps.contactPhone });
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
      screen.getByRole("heading", { name: "Applications" });
      screen.getByRole("link", { name: application.different });
      screen.getByText("Also for applications");
      expect(screen.queryByRole("heading", { name: "For questions and applications" })).toBeNull();
    },
  );

  it("explains when the lister has provided no contact or application details", () => {
    render(<ListingDetails {...baseProps} />);

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    screen.getByText(
      "The lister hasn't provided contact or application details for this listing yet. Please check back later.",
    );
  });
});
