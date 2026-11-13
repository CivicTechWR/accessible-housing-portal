import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// Radix tabs select on mouse down (not click), with the primary button.
function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

function expectSelected(name: string) {
  const other = name === "Form" ? "Preview" : "Form";
  expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: other })).toHaveAttribute("aria-selected", "false");
  expect(screen.getByRole("tabpanel", { name })).toHaveAttribute("data-state", "active");
  // Both panels stay mounted; the inactive one is hidden below lg by CSS only.
  expect(screen.getByRole("tabpanel", { name: other })).toHaveAttribute("data-state", "inactive");
  expect(screen.getByRole("tabpanel", { name: other })).toHaveClass(
    "data-[state=inactive]:hidden",
    "lg:data-[state=inactive]:block",
  );
}

describe("ListingFormLayout pane tabs", () => {
  it("shows the form tab by default", () => {
    renderLayout();

    expect(screen.getByRole("tablist", { name: "Listing editor view" })).toBeInTheDocument();
    expectSelected("Form");
  });

  it("shows the preview panel when its tab is selected, without unmounting the form", () => {
    renderLayout();
    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: "Unsaved title" } });

    selectTab("Preview");
    expectSelected("Preview");
    expect(screen.getByText("Preview content")).toBeInTheDocument();

    selectTab("Form");
    expectSelected("Form");
    expect(screen.getByLabelText("Title")).toBe(titleInput);
    expect(titleInput).toHaveValue("Unsaved title");
  });

  it("moves between tabs with the arrow keys", async () => {
    renderLayout();
    const formTab = screen.getByRole("tab", { name: "Form" });
    formTab.focus();

    fireEvent.keyDown(formTab, { key: "ArrowRight" });
    // Radix moves roving focus on the next tick.
    await waitFor(() => expect(screen.getByRole("tab", { name: "Preview" })).toHaveFocus());
    expectSelected("Preview");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Preview" }), { key: "ArrowLeft" });
    await waitFor(() => expect(formTab).toHaveFocus());
    expectSelected("Form");
  });

  it("has no tabs when there is no preview", () => {
    renderLayout(false);

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.getByRole("region", { name: "Form" })).toBeVisible();
  });
});
