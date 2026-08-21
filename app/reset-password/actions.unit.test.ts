/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  resetPasswordWithTokenAction,
  type ResetPasswordWithTokenState,
} from "@/app/reset-password/actions";
import {
  consumePasswordResetToken,
  PasswordResetUnavailableError,
} from "@/lib/auth/password-reset-service";
import { hashPassword } from "@/lib/auth/password";

jest.mock("@/lib/auth/password", () => ({
  hashPassword: jest.fn(),
}));

jest.mock("@/lib/auth/password-reset-service", () => ({
  PasswordResetUnavailableError: class extends Error {
    constructor() {
      super("Password reset link is invalid or has expired.");
      this.name = "PasswordResetUnavailableError";
    }
  },
  consumePasswordResetToken: jest.fn(),
}));

const hashPasswordMock = jest.mocked(hashPassword);
const consumePasswordResetTokenMock = jest.mocked(consumePasswordResetToken);

function buildFormData(values: Record<string, string>) {
  return {
    get: (key: string) => values[key],
  } as unknown as FormData;
}

beforeEach(() => {
  jest.clearAllMocks();
  hashPasswordMock.mockResolvedValue("new-hash");
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("resetPasswordWithTokenAction", () => {
  const validValues = {
    token: "raw-token",
    newPassword: "validpass1",
    confirmNewPassword: "validpass1",
  };

  it("maps per-field validation messages into fieldErrors", async () => {
    const result = await resetPasswordWithTokenAction(
      {},
      buildFormData({ ...validValues, newPassword: "short", confirmNewPassword: "short" }),
    );

    expect(result.fieldErrors?.newPassword?.length).toBeGreaterThan(0);
    // The mismatch refine targets confirmNewPassword.
    const mismatch = await resetPasswordWithTokenAction(
      {},
      buildFormData({ ...validValues, confirmNewPassword: "different1" }),
    );
    expect(mismatch.fieldErrors?.confirmNewPassword).toEqual(["Passwords do not match."]);
    expect(consumePasswordResetTokenMock).not.toHaveBeenCalled();
  });

  it("consumes the token atomically and reports success", async () => {
    consumePasswordResetTokenMock.mockResolvedValue(undefined);

    const result = await resetPasswordWithTokenAction({}, buildFormData(validValues));

    expect(hashPasswordMock).toHaveBeenCalledWith("validpass1");
    expect(consumePasswordResetTokenMock).toHaveBeenCalledWith({
      token: "raw-token",
      passwordHash: "new-hash",
    });
    expect(result.success).toBe("Password updated successfully. You can now sign in.");
  });

  it("returns a generic error for unknown, used, or expired tokens", async () => {
    consumePasswordResetTokenMock.mockRejectedValue(new PasswordResetUnavailableError());

    const result: ResetPasswordWithTokenState = await resetPasswordWithTokenAction(
      {},
      buildFormData(validValues),
    );

    expect(result.error).toBe("This password reset link is invalid or has expired.");
    expect(result.success).toBeUndefined();
  });

  it("rethrows unexpected failures", async () => {
    consumePasswordResetTokenMock.mockRejectedValue(new Error("database down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(resetPasswordWithTokenAction({}, buildFormData(validValues))).rejects.toThrow(
      "database down",
    );
  });
});
