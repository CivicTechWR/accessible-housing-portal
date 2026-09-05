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
  findUnconsumedPasswordResetToken,
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
  findUnconsumedPasswordResetToken: jest.fn(),
}));

const hashPasswordMock = jest.mocked(hashPassword);
const consumePasswordResetTokenMock = jest.mocked(consumePasswordResetToken);
const findUnconsumedPasswordResetTokenMock = jest.mocked(findUnconsumedPasswordResetToken);

function buildFormData(values: Record<string, string>) {
  return {
    get: (key: string) => values[key],
  } as unknown as FormData;
}

beforeEach(() => {
  jest.clearAllMocks();
  hashPasswordMock.mockResolvedValue("new-hash");
  findUnconsumedPasswordResetTokenMock.mockResolvedValue({ id: "token-row-1" });
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

  it("returns the invalid-link error when the hidden token is missing", async () => {
    const result = await resetPasswordWithTokenAction(
      {},
      buildFormData({ newPassword: "validpass1", confirmNewPassword: "validpass1" }),
    );

    expect(result.error).toBe("This password reset link is invalid or has expired.");
    expect(result.fieldErrors).toBeUndefined();
    expect(hashPasswordMock).not.toHaveBeenCalled();
  });

  it("rejects unknown, used, or expired tokens before any password hashing", async () => {
    findUnconsumedPasswordResetTokenMock.mockResolvedValue(null);

    const result = await resetPasswordWithTokenAction({}, buildFormData(validValues));

    expect(result.error).toBe("This password reset link is invalid or has expired.");
    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(consumePasswordResetTokenMock).not.toHaveBeenCalled();
  });

  it("consumes the token atomically and reports success", async () => {
    consumePasswordResetTokenMock.mockResolvedValue(undefined);

    const result = await resetPasswordWithTokenAction({}, buildFormData(validValues));

    expect(findUnconsumedPasswordResetTokenMock).toHaveBeenCalledWith("raw-token");
    expect(hashPasswordMock).toHaveBeenCalledWith("validpass1");
    expect(consumePasswordResetTokenMock).toHaveBeenCalledWith({
      token: "raw-token",
      passwordHash: "new-hash",
    });
    expect(result.success).toBe("Password updated successfully. You can now sign in.");
  });

  it("returns a generic error when a racing request consumed the token first", async () => {
    // The cheap pre-check passes, but the atomic claim loses the race.
    consumePasswordResetTokenMock.mockRejectedValue(new PasswordResetUnavailableError());

    const result: ResetPasswordWithTokenState = await resetPasswordWithTokenAction(
      {},
      buildFormData(validValues),
    );

    expect(result.error).toBe("This password reset link is invalid or has expired.");
    expect(result.success).toBeUndefined();
  });

  it("rethrows unexpected failures", async () => {
    findUnconsumedPasswordResetTokenMock.mockRejectedValue(new Error("database down"));

    await expect(resetPasswordWithTokenAction({}, buildFormData(validValues))).rejects.toThrow(
      "database down",
    );
  });
});
