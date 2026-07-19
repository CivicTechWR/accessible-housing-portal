import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";
import { useForm } from "react-hook-form";

import {
  CREATE_FORM_DEFAULTS,
  type ListingFormContext,
  type ListingFormData,
  type ListingFormInput,
  type ListingFormMethods,
} from "@/app/listing-form/types";
import { Form } from "@/components/ui/form";
import { ListingFormFields } from "./ListingFormFields";

function Harness({
  defaultValues,
  onReady,
}: {
  defaultValues?: Partial<ListingFormInput>;
  onReady: (methods: ListingFormMethods) => void;
}) {
  const form = useForm<ListingFormInput, ListingFormContext, ListingFormData>({
    defaultValues: {
      ...CREATE_FORM_DEFAULTS,
      monthlyRentCents: 150000,
      leaseTerm: 12,
      ...defaultValues,
    },
  });
  onReady(form);

  return (
    <Form {...form}>
      <ListingFormFields control={form.control} />
    </Form>
  );
}

function renderFields(defaultValues?: Partial<ListingFormInput>) {
  let methods: ListingFormMethods | undefined;
  render(
    <Harness
      defaultValues={defaultValues}
      onReady={(form) => {
        methods = form;
      }}
    />,
  );

  if (!methods) {
    throw new Error("Form methods were not captured");
  }

  return methods;
}

describe("ListingFormFields utilities included", () => {
  it("renders an unchecked checkbox for each utility", () => {
    renderFields();

    for (const name of ["Heat", "Water", "Electricity", "Gas", "Internet"]) {
      const checkbox = screen.getByRole("checkbox", { name });
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    }
  });

  it("adds and removes utilities from the form value when toggled", () => {
    const methods = renderFields();

    fireEvent.click(screen.getByRole("checkbox", { name: "Heat" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Internet" }));
    expect(methods.getValues("utilitiesIncluded")).toEqual(["heat", "internet"]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Heat" }));
    expect(methods.getValues("utilitiesIncluded")).toEqual(["internet"]);
  });

  it("renders saved utilities as checked", () => {
    renderFields({ utilitiesIncluded: ["water", "gas"] });

    expect(screen.getByRole("checkbox", { name: "Water" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("checkbox", { name: "Gas" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("checkbox", { name: "Heat" }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });
});
