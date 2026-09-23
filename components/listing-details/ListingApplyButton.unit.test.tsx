import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { ListingApplyButton } from "./ListingApplyButton";

describe("ListingApplyButton", () => {
  it("shows the application URL in a leaving-site dialog that the user can cancel", () => {
    render(<ListingApplyButton applicationUrl="https://example.org/apply" />);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    screen.getByText("Leaving Home Hub");
    screen.getByText("You're now leaving the site. This will take you to:");
    screen.getByText("https://example.org/apply");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Leaving Home Hub")).toBeNull();
  });

  it("navigates to the application URL when the user confirms", () => {
    const originalUrl = window.location.href;
    const applicationUrl = new URL("#application", originalUrl).toString();

    render(<ListingApplyButton applicationUrl={applicationUrl} />);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(window.location.href).toBe(applicationUrl);
    window.history.replaceState(null, "", originalUrl);
  });
});
