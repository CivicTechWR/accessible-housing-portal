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

  it("closes the leaving-site dialog when the user cancels", () => {
    render(<ListingApplyButton applicationUrl="https://example.org/apply" />);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Leaving Affordable Housing Portal")).toBeNull();
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
