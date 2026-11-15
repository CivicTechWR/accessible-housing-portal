import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";
import { useForm } from "react-hook-form";

import {
  CREATE_FORM_DEFAULTS,
  type ListingFormContext,
  type ListingFormData,
  type ListingFormInput,
  type ListingFormMethods,
} from "@/app/listing-form/types";
import { mapListingFormToAutosavePatchInput } from "@/app/listing-form/api";
import { Form } from "@/components/ui/form";
import { HOUSING_DEFINITIONS } from "@/shared/housing-definitions";
import { ListingFormFields } from "./ListingFormFields";

function TestListingForm({
  defaultValues = CREATE_FORM_DEFAULTS,
  onFormReady,
}: {
  defaultValues?: Partial<ListingFormInput>;
  onFormReady?: (form: ListingFormMethods) => void;
}) {
  const form = useForm<ListingFormInput, ListingFormContext, ListingFormData>({
    defaultValues,
  });
  onFormReady?.(form);

  return (
    <Form {...form}>
      <ListingFormFields control={form.control} />
    </Form>
  );
}

function renderForm(defaultValues: Partial<ListingFormInput> = {}) {
  let form: ListingFormMethods | undefined;
  render(
    <TestListingForm
      defaultValues={{ ...CREATE_FORM_DEFAULTS, ...defaultValues }}
      onFormReady={(value) => (form = value)}
    />,
  );
  if (!form) throw new Error("Form was not initialized");
  return form;
}

describe("ListingFormFields", () => {
  it("stores typed deposit information on the form", () => {
    const form = renderForm();

    fireEvent.change(screen.getByPlaceholderText("E.g. First and last month's rent, refundable"), {
      target: { value: "First and last month's rent, refundable" },
    });

    expect(form.getValues("depositInfo")).toBe("First and last month's rent, refundable");
  });

  it("explains the initial lease term with the shared definition", () => {
    renderForm();
    const { label, description } = HOUSING_DEFINITIONS.leaseTerm;

    expect(screen.getByRole("button", { name: label })).toHaveAccessibleDescription(description);
    expect(
      screen.getByRole("spinbutton", { name: /Initial Lease Term/ }),
    ).toHaveAccessibleDescription(description);
  });

  it("renders a described checkbox for each utility", () => {
    renderForm();

    const description = screen.getByText("Select all utilities included in the monthly rent.");
    for (const label of ["Heat", "Water", "Electricity", "Gas", "Internet"]) {
      const checkbox = screen.getByRole("checkbox", { name: label });
      expect(checkbox).not.toBeChecked();
      expect(checkbox).toHaveAttribute("aria-describedby", description.id);
    }
  });

  it("checks saved utilities and adds and removes them when toggled", () => {
    const form = renderForm({ utilitiesIncluded: ["water"] });

    expect(screen.getByRole("checkbox", { name: "Water" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Heat" }));
    expect(form.getValues("utilitiesIncluded")).toEqual(["heat", "water"]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Water" }));
    expect(form.getValues("utilitiesIncluded")).toEqual(["heat"]);
  });

  it("sends an explicit clear after removing a saved contact role", () => {
    const form = renderForm({ contactRole: "Property manager" });

    fireEvent.change(screen.getByRole("textbox", { name: "Contact Role" }), {
      target: { value: "" },
    });

    expect(mapListingFormToAutosavePatchInput(form.getValues())?.contact?.role).toBeNull();
  });

  it("clears a saved heating selection without changing the required building type", () => {
    const form = renderForm({ heatingType: "heat_pump", buildingType: "apartment" });

    fireEvent.click(screen.getByRole("button", { name: "Clear primary heating type" }));

    expect(form.getValues("heatingType")).toBe("");
    expect(form.getValues("buildingType")).toBe("apartment");
    expect(screen.getByRole("combobox", { name: "Primary heating type" }).textContent).toBe(
      "Select primary heating type",
    );
  });

  describe("number fields", () => {
    const numberFields = [
      "Bedrooms",
      "Bathrooms",
      "Square Feet",
      "Monthly Rent ($)",
      "Initial Lease Term in Months",
    ];
    // Required labels end in " *", so match on the start of the accessible name.
    const getNumberInput = (label: string) =>
      screen.getByRole("spinbutton", { name: (name) => name.startsWith(label) });

    it.each(numberFields)("starts %s empty on a new listing", (label) => {
      renderForm();

      expect(getNumberInput(label)).toHaveValue(null);
    });

    it("keeps the remaining zeros when the first digit of a saved number is deleted", () => {
      const form = renderForm({ squareFeet: 1000 });
      const input = getNumberInput("Square Feet");

      fireEvent.change(input, { target: { value: "000" } });

      expect(input).toHaveDisplayValue("000");
      expect(form.getValues("squareFeet")).toBe(0);
    });

    it("drops a leading zero typed after a saved 0", () => {
      const form = renderForm({ bedrooms: 0 });
      const input = getNumberInput("Bedrooms");
      expect(input).toHaveDisplayValue("0");

      fireEvent.change(input, { target: { value: "02" } });

      expect(input).toHaveDisplayValue("2");
      expect(form.getValues("bedrooms")).toBe(2);
    });

    it("stores an explicitly typed 0", () => {
      const form = renderForm();
      const input = getNumberInput("Bedrooms");

      fireEvent.change(input, { target: { value: "0" } });

      expect(input).toHaveDisplayValue("0");
      expect(form.getValues("bedrooms")).toBe(0);
    });

    it("stores no value after a typed number is cleared", () => {
      const form = renderForm();
      const input = getNumberInput("Square Feet");

      fireEvent.change(input, { target: { value: "850" } });
      fireEvent.change(input, { target: { value: "" } });

      expect(input).toHaveValue(null);
      expect(form.getValues("squareFeet")).toBeUndefined();
    });

    it("shows saved rent in dollars and stores typed rent in cents", () => {
      const form = renderForm({ monthlyRentCents: 185000 });
      const input = getNumberInput("Monthly Rent ($)");
      expect(input).toHaveDisplayValue("1850");

      fireEvent.change(input, { target: { value: "1900" } });

      expect(input).toHaveDisplayValue("1900");
      expect(form.getValues("monthlyRentCents")).toBe(190000);
    });
  });
});
