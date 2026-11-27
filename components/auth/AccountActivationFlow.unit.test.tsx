import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, jest } from "@jest/globals";

import { AccountActivationFlow } from "@/components/auth/AccountActivationFlow";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { authClient } from "@/lib/auth-client";

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    resetPassword: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it("moves from the community agreement to account setup in order", () => {
  render(<AccountActivationFlow token="invite-token" email="person@example.com" />);

  expect(screen.getByText("Step 1 of 2: Community agreement")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Community agreement and terms of use" }),
  ).toBeVisible();
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();

  const continueButton = screen.getByRole("button", { name: "Continue" });
  const checkbox = screen.getByRole("checkbox", { name: "I agree to the community agreement" });

  // Continuing before agreeing explains what's missing and stays on the agreement.
  fireEvent.click(continueButton);
  expect(screen.getByRole("alert")).toHaveTextContent("Tick the box to agree before continuing.");
  expect(checkbox).toHaveFocus();
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();

  fireEvent.click(checkbox);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(continueButton);

  expect(screen.getByText("Step 2 of 2: Account setup")).toBeVisible();
  expect(screen.queryByText("Step 1 of 2: Community agreement")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Activate your account" })).toBeVisible();
  expect(screen.getByLabelText("New password")).toBeVisible();
  expect(screen.queryByText("Community agreement and terms of use")).not.toBeInTheDocument();
  expect(authClient.resetPassword).not.toHaveBeenCalled();
});

it("keeps password reset independent from the account activation steps", () => {
  render(<AcceptInviteForm token="reset-token" />);

  expect(screen.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  expect(screen.queryByText("Community agreement and terms of use")).not.toBeInTheDocument();
});
