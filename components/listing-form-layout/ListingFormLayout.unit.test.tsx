import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { ListingFormLayout } from "./ListingFormLayout";

function renderLayout(withPreview = true) {
  return render(
    <ListingFormLayout
      formContent={<input aria-label="Title" />}
      previewContent={withPreview ? <p>Preview content</p> : undefined}
      footer={<button type="submit">Save Changes</button>}
    />,
  );
}

describe("ListingFormLayout pane switcher", () => {
  it("shows the form pane by default", () => {
    renderLayout();

    expect(screen.getByRole("radio", { name: "Form" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Preview" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("region", { name: "Form" })).not.toHaveClass("hidden");
    expect(screen.getByRole("region", { name: "Preview", hidden: true })).toHaveClass(
      "hidden",
      "lg:block",
    );
  });

  it("switches panes without unmounting the form", () => {
    renderLayout();
    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: "Unsaved title" } });

    fireEvent.click(screen.getByRole("radio", { name: "Preview" }));
    expect(screen.getByRole("radio", { name: "Preview" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("region", { name: "Preview" })).not.toHaveClass("hidden");
    expect(screen.getByRole("region", { name: "Form", hidden: true })).toHaveClass("hidden");

    fireEvent.click(screen.getByRole("radio", { name: "Form" }));
    expect(screen.getByLabelText("Title")).toBe(titleInput);
    expect(titleInput).toHaveValue("Unsaved title");
  });

  it("points each option at the pane it controls", () => {
    renderLayout();

    for (const name of ["Form", "Preview"]) {
      const controlledId = screen.getByRole("radio", { name }).getAttribute("aria-controls");
      expect(document.getElementById(controlledId ?? "")).toHaveAccessibleName(name);
    }
  });

  it("keeps the current pane when the selected option is pressed again", () => {
    renderLayout();

    fireEvent.click(screen.getByRole("radio", { name: "Form" }));
    expect(screen.getByRole("radio", { name: "Form" })).toHaveAttribute("aria-checked", "true");
  });

  it("has no switcher when there is no preview", () => {
    renderLayout(false);

    expect(screen.queryByRole("group", { name: "Listing editor view" })).toBeNull();
    expect(screen.getByRole("region", { name: "Form" })).not.toHaveClass("hidden");
  });
});
