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

describe("ListingFormFields deposit information", () => {
  it("renders an optional deposit information textarea", () => {
    render(<TestListingForm />);

    expect(screen.queryByText("Deposit Information")).not.toBeNull();
    expect(
      screen.queryByText("Describe any deposits required so tenants know what to expect."),
    ).not.toBeNull();
    expect(
      screen.getByPlaceholderText("E.g. First and last month's rent, refundable"),
    ).not.toBeNull();
  });

  it("stores typed deposit information on the form", () => {
    let form: ListingFormMethods | undefined;
    render(<TestListingForm onFormReady={(f) => (form = f)} />);

    fireEvent.change(screen.getByPlaceholderText("E.g. First and last month's rent, refundable"), {
      target: { value: "First and last month's rent, refundable" },
    });

    expect(form?.getValues("depositInfo")).toBe("First and last month's rent, refundable");
  });
});

describe("ListingFormFields utilities included", () => {
  it("renders a checkbox for each utility", () => {
    render(<TestListingForm />);

    expect(screen.queryByText("Utilities Included")).not.toBeNull();
    const description = screen.getByText("Select all utilities included in the monthly rent.");

    for (const label of ["Heat", "Water", "Electricity", "Gas", "Internet"]) {
      const checkbox = screen.getByRole("checkbox", { name: label });
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
      expect(checkbox.getAttribute("aria-describedby")).toBe(description.id);
    }
  });

  it("checks the boxes for utilities already selected", () => {
    render(
      <TestListingForm
        defaultValues={{ ...CREATE_FORM_DEFAULTS, utilitiesIncluded: ["heat", "internet"] }}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Heat" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("checkbox", { name: "Internet" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("checkbox", { name: "Water" }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("adds and removes utilities in the form value when toggled", () => {
    let form: ListingFormMethods | undefined;
    render(<TestListingForm onFormReady={(f) => (form = f)} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Water" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Heat" }));
    expect(form?.getValues("utilitiesIncluded")).toEqual(["heat", "water"]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Water" }));
    expect(form?.getValues("utilitiesIncluded")).toEqual(["heat"]);
  });
});

describe("contact role editing", () => {
  it("sends an explicit clear after removing a saved role", () => {
    let form: ListingFormMethods | undefined;
    render(
      <TestListingForm
        defaultValues={{ ...CREATE_FORM_DEFAULTS, contactRole: "Property manager" }}
        onFormReady={(value) => (form = value)}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Contact Role" }), {
      target: { value: "" },
    });

    if (!form) throw new Error("Form was not initialized");
    expect(mapListingFormToAutosavePatchInput(form.getValues())?.contact?.role).toBeNull();
  });
});

describe("ListingFormFields heating type", () => {
  it("clears a saved heating selection without changing the required building type", () => {
    let form: ListingFormMethods | undefined;
    render(
      <TestListingForm
        defaultValues={{
          ...CREATE_FORM_DEFAULTS,
          heatingType: "heat_pump",
          buildingType: "apartment",
        }}
        onFormReady={(value) => (form = value)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear primary heating type" }));

    expect(form?.getValues("heatingType")).toBe("");
    expect(form?.getValues("buildingType")).toBe("apartment");
    expect(screen.getByRole("combobox", { name: "Primary heating type" }).textContent).toBe(
      "Select primary heating type",
    );
  });
});
