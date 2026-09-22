import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { authClient } from "@/lib/auth-client";

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    resetPassword: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

it("requires invited users to accept the community agreement before account setup", () => {
  render(
    <AcceptInviteForm token="invite-token" email="person@example.com" requiresAgreement />,
  );

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
  expect(authClient.resetPassword).not.toHaveBeenCalled();
});

it("does not show the account agreement on password reset", () => {
  render(<AcceptInviteForm token="reset-token" />);

  expect(screen.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  expect(screen.queryByText("Community Agreement & Terms of Use")).not.toBeInTheDocument();
});

it("does not infer the agreement requirement from the email prop", () => {
  render(<AcceptInviteForm token="reset-token" email="person@example.com" />);

  expect(screen.getByRole("heading", { name: "Activate your account" })).toBeVisible();
  expect(screen.queryByText("Community Agreement & Terms of Use")).not.toBeInTheDocument();
});
