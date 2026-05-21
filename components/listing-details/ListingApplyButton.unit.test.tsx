import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { ListingApplyButton } from "./ListingApplyButton";

describe("ListingApplyButton", () => {
  it("opens a leaving-site confirmation dialog with the application URL", () => {
    render(<ListingApplyButton applicationUrl="https://example.org/apply" />);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.queryByText("Leaving Affordable Housing Portal")).not.toBeNull();
    expect(
      screen.queryByText("You're now leaving the site. This will take you to:"),
    ).not.toBeNull();
    expect(screen.queryByText("https://example.org/apply")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeNull();
  });
});
