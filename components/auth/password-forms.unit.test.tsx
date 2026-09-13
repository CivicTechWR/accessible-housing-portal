import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { AccountSecurity } from "@/components/auth/AccountSecurity";
import { authClient } from "@/lib/auth-client";

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    useSession: () => ({ data: null }),
    useListPasskeys: () => ({ data: [], refetch: jest.fn() }),
  },
}));

beforeEach(() => jest.clearAllMocks());

it("associates reset validation with each field and focuses the first error", () => {
  render(<AcceptInviteForm token="reset-token" />);
  const password = screen.getByLabelText("New password");
  const confirmation = screen.getByLabelText("Confirm password");
  fireEvent.change(password, { target: { value: "short" } });
  fireEvent.change(confirmation, { target: { value: "different" } });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));

  expect(password).toHaveAttribute("aria-invalid", "true");
  expect(password).toHaveAccessibleDescription("Use 12 to 128 characters.");
  expect(password).toHaveFocus();
  expect(confirmation).toHaveAccessibleDescription("Passwords do not match.");
  expect(authClient.resetPassword).not.toHaveBeenCalled();
});

it("shows a rejected current password beside its input and clears it on retry", async () => {
  jest
    .mocked(authClient.changePassword)
    .mockResolvedValueOnce({
      data: null,
      error: { code: "INVALID_PASSWORD", status: 400, statusText: "Bad Request" },
    })
    .mockResolvedValueOnce({ data: { token: null, user: {} }, error: null });
  render(<AccountSecurity />);
  const current = document.getElementById("current-password")!;
  const password = screen.getByLabelText("New password, 12 to 128 characters");
  const confirmation = screen.getByLabelText("Confirm new password");
  fireEvent.change(current, { target: { value: "Incorrect-password" } });
  fireEvent.change(password, { target: { value: "Replacement-password" } });
  fireEvent.change(confirmation, { target: { value: "Replacement-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Change password" }));

  await waitFor(() =>
    expect(current).toHaveAccessibleDescription("Your current password is incorrect."),
  );
  expect(current).toHaveAttribute("aria-invalid", "true");
  expect(current).toHaveFocus();
  fireEvent.change(current, { target: { value: "Correct-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Change password" }));
  await screen.findByText("Password changed. Other sessions have been signed out.");
  expect(current).toHaveAttribute("aria-invalid", "false");
  expect(current).not.toHaveAttribute("aria-describedby");
});
