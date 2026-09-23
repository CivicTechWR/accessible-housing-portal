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
  render(
    <DuplicateListingDialog
      listing={listing}
      isDuplicating={false}
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
      {...overrides}
    />,
  );
}

describe("DuplicateListingDialog", () => {
  it("describes the source listing and defaults to copying all fields without photos", () => {
    renderDialog();

    screen.getByText(
      "Create a new draft from Unit 204. You can review and edit it before publishing.",
    );
    screen.getByText("The 8 photos from Unit 204 will be added to the new draft.");
    expect(screen.getByRole("radio", { name: /All fields/ })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Copy photos?" })).not.toBeChecked();
    screen.getByText(
      "All fields will be copied. Photos will not be copied. The unit number and availability date will be left blank.",
    );
  });

  it("summarizes what a building-only copy leaves blank", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /Building information only/ }));

    screen.getByText(
      "Building information will be copied. Unit details will be left blank. Photos will not be copied.",
    );
  });

  it("disables the photo toggle when the listing has no photos", () => {
    renderDialog({ listing: { ...listing, imageCount: 0 } });

    expect(screen.getByRole("switch", { name: "Copy photos?" })).toBeDisabled();
    screen.getByText("Unit 204 has no photos to copy.");
    screen.getByText(
      "All fields will be copied. There are no photos to copy. The unit number and availability date will be left blank.",
    );
  });
});
