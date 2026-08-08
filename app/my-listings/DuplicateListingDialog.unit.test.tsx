import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, jest } from "@jest/globals";

import { DuplicateListingDialog } from "./DuplicateListingDialog";

const listing = {
  title: "Sunny 2BR near uptown",
  unitNumber: "204",
  imageCount: 8,
};

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof DuplicateListingDialog>> = {},
) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  render(
    <DuplicateListingDialog
      listing={listing}
      isDuplicating={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );

  return { onCancel, onConfirm };
}

describe("DuplicateListingDialog", () => {
  it("describes the source listing and defaults to copying all fields without photos", () => {
    renderDialog();

    expect(
      screen.queryByText(
        "Create a new draft from Unit 204. You can review and edit it before publishing.",
      ),
    ).not.toBeNull();
    expect(
      screen.queryByText("The 8 photos from Unit 204 will be added to the new draft."),
    ).not.toBeNull();
    expect(screen.getByRole("radio", { name: /All fields/ }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("switch", { name: "Copy photos?" }).getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(
      screen.queryByText(
        "All fields will be copied. Photos will not be copied. The unit number and availability date will be left blank.",
      ),
    ).not.toBeNull();
  });

  it("summarizes what a building-only copy leaves blank", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /Building information only/ }));

    expect(
      screen.queryByText(
        "Building information will be copied. Unit details will be left blank. Photos will not be copied.",
      ),
    ).not.toBeNull();
  });

  it("confirms with the selected scope and photo choice", () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /Unit information only/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Copy photos?" }));

    expect(
      screen.queryByText(
        "Unit information will be copied. Building details will be left blank. 8 photos will be copied to the new draft. The unit number and availability date will be left blank.",
      ),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Duplicate as draft" }));

    expect(onConfirm).toHaveBeenCalledWith({ scope: "unit", copyPhotos: true });
  });

  it("disables the photo toggle when the listing has no photos", () => {
    renderDialog({ listing: { ...listing, imageCount: 0 } });

    const photoSwitch = screen.getByRole("switch", { name: "Copy photos?" });

    expect(photoSwitch.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Unit 204 has no photos to copy.")).not.toBeNull();
    expect(
      screen.queryByText(
        "All fields will be copied. There are no photos to copy. The unit number and availability date will be left blank.",
      ),
    ).not.toBeNull();
  });
});
