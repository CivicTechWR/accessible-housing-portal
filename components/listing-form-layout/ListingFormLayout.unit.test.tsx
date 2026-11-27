import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { ListingFormLayout } from "./ListingFormLayout";

function renderLayout(withPreview = true) {
  return render(
    <ListingFormLayout
      formContent={<input aria-label="Title" />}
      previewContent={withPreview ? <p>Preview content</p> : undefined}
      footerAction={<button type="submit">Save Changes</button>}
    />,
  );
}

// Below lg the inactive pane is hidden by CSS only, so both stay mounted.
function expectShown(name: "Form" | "Preview") {
  const other = name === "Form" ? "Preview" : "Form";
  expect(screen.getByRole("region", { name })).not.toHaveClass("max-lg:hidden");
  expect(screen.getByRole("region", { name: other })).toHaveClass("max-lg:hidden");
}

describe("ListingFormLayout pane switch", () => {
  it("shows the form first, with a Preview button in the sticky bar", () => {
    renderLayout();

    expectShown("Form");
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
  });

  it("swaps to the preview and back without unmounting the form", () => {
    renderLayout();
    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: "Unsaved title" } });

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expectShown("Preview");
    expect(screen.getByText("Preview content")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expectShown("Form");
    expect(screen.getByLabelText("Title")).toBe(titleInput);
    expect(titleInput).toHaveValue("Unsaved title");
  });

  it("has no pane switch when there is no preview", () => {
    renderLayout(false);

    expect(screen.queryByRole("button", { name: "Preview" })).toBeNull();
    expect(screen.getByRole("region", { name: "Form" })).not.toHaveClass("max-lg:hidden");
  });
});
