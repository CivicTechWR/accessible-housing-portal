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
        heatingType="heat_pump"
        utilitiesIncluded={["water"]}
        leaseTermMonths={12}
        availableOn="2026-09-01"
        depositInfo="First and last month's rent, refundable"
      />,
    );

    expect(screen.queryByText("Description")).not.toBeNull();
    expect(screen.queryByText("Bright corner unit near the LRT.")).not.toBeNull();
    expect(screen.queryByText("Building Type")).not.toBeNull();
    expect(screen.queryByText("Apartment")).not.toBeNull();
    expect(screen.queryByText("Deposit")).not.toBeNull();
    expect(screen.queryByText("First and last month's rent, refundable")).not.toBeNull();
    const labels = screen.getAllByRole("term").map((node) => node.textContent);
    expect(labels.indexOf("Deposit")).toBeLessThan(labels.indexOf("Rental Cost"));
    expect(screen.queryByText("Electric heat pump")).not.toBeNull();
    expect(screen.queryByText("Water")).not.toBeNull();
    expect(labels.indexOf("Primary heating type") + 1).toBe(labels.indexOf("Utilities Included"));
    expect(screen.queryByText("Initial Lease Term")).not.toBeNull();
    expect(screen.queryByText("12-month lease")).not.toBeNull();
    expect(screen.queryByText("Available")).not.toBeNull();
    expect(screen.queryByText("September 1, 2026")).not.toBeNull();
  });

  it("omits the rows and description section when the fields are missing", () => {
    render(<ListingDetails {...baseProps} />);

    expect(screen.queryByText("Description")).toBeNull();
    expect(screen.queryByText("Building Type")).toBeNull();
    expect(screen.queryByText("Primary heating type")).toBeNull();
    expect(screen.queryByText("Initial Lease Term")).toBeNull();
    expect(screen.queryByText("Available")).toBeNull();
    expect(screen.queryByText("Deposit")).toBeNull();
  });

  it("does not render a description section for whitespace-only descriptions", () => {
    render(<ListingDetails {...baseProps} description="   " />);

    expect(screen.queryByText("Description")).toBeNull();
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
    expect(depositValue.className).toContain("whitespace-pre-line");
  });
});
