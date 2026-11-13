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

    expect(screen.getByRole("button", { name: "Form" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Preview" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
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

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("button", { name: "Preview" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Preview" })).not.toHaveClass("hidden");
    expect(screen.getByRole("region", { name: "Form", hidden: true })).toHaveClass("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Form" }));
    expect(screen.getByLabelText("Title")).toBe(titleInput);
    expect(titleInput).toHaveValue("Unsaved title");
  });

  it("points each option at the pane it controls", () => {
    renderLayout();

    for (const name of ["Form", "Preview"]) {
      const controlledId = screen.getByRole("button", { name }).getAttribute("aria-controls");
      expect(document.getElementById(controlledId ?? "")).toHaveAccessibleName(name);
    }
  });

  it("has no switcher when there is no preview", () => {
    renderLayout(false);

    expect(screen.queryByRole("group", { name: "Listing editor view" })).toBeNull();
    expect(screen.getByRole("region", { name: "Form" })).not.toHaveClass("hidden");
  });
});
