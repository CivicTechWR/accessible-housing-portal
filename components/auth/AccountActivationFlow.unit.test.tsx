import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { AccountActivationFlow } from "@/components/auth/AccountActivationFlow";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { authClient } from "@/lib/auth-client";

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    resetPassword: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

it("moves from the community agreement to account setup in order", () => {
  render(<AccountActivationFlow token="invite-token" email="person@example.com" />);

  expect(screen.getByRole("heading", { name: "Community Agreement & Terms of Use" })).toBeVisible();
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();

  const continueButton = screen.getByRole("button", { name: "Agree and continue" });
  expect(continueButton).toBeDisabled();

  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "I have read and agree to the Community Agreement & Terms of Use.",
    }),
  );
  expect(continueButton).toBeEnabled();
  fireEvent.click(continueButton);

  expect(screen.getByRole("heading", { name: "Activate your account" })).toBeVisible();
  expect(screen.getByLabelText("New password")).toBeVisible();
  expect(screen.queryByText("Community Agreement & Terms of Use")).not.toBeInTheDocument();
  expect(authClient.resetPassword).not.toHaveBeenCalled();
});

it("keeps password reset independent from the account activation steps", () => {
  render(<AcceptInviteForm token="reset-token" />);

  expect(screen.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  expect(screen.queryByText("Community Agreement & Terms of Use")).not.toBeInTheDocument();
});
