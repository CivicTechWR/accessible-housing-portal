/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import {
  countRecentPasswordResets,
  createPasswordReset,
  PASSWORD_RESET_MAX_PER_HOUR,
} from "@/lib/auth/password-reset-service";

jest.mock("@/lib/auth/user-store", () => ({
  getUserForAuth: jest.fn(),
  isUserAllowedToSignIn: (
    jest.requireActual("@/lib/auth/user-store") as typeof import("@/lib/auth/user-store")
  ).isUserAllowedToSignIn,
}));

jest.mock("@/lib/auth/password-reset-service", () => ({
  countRecentPasswordResets: jest.fn(),
  createPasswordReset: jest.fn(),
  PASSWORD_RESET_MAX_PER_HOUR: 3,
}));

import { getUserForAuth } from "@/lib/auth/user-store";

const getUserForAuthMock = jest.mocked(getUserForAuth);
const countRecentPasswordResetsMock = jest.mocked(countRecentPasswordResets);
const createPasswordResetMock = jest.mocked(createPasswordReset);

const SUCCESS_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

function buildFormData(email: string) {
  return {
    email,
    get: (key: string) => (key === "email" ? email : undefined),
  } as unknown as FormData;
}

beforeEach(() => {
  jest.clearAllMocks();
  countRecentPasswordResetsMock.mockResolvedValue(0);
  createPasswordResetMock.mockResolvedValue({ expiresAt: new Date() });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("requestPasswordResetAction", () => {
  it("returns the same neutral success message for an unknown email", async () => {
    getUserForAuthMock.mockResolvedValue(null);

    const result = await requestPasswordResetAction({}, buildFormData("nobody@example.org"));

    expect(result).toEqual({ success: SUCCESS_MESSAGE });
    expect(createPasswordResetMock).not.toHaveBeenCalled();
  });

  it("returns the same neutral success message for an account without a password hash", async () => {
    getUserForAuthMock.mockResolvedValue({
      id: "user-1",
      status: "active",
      passwordHash: null,
    } as Awaited<ReturnType<typeof getUserForAuth>>);

    const result = await requestPasswordResetAction({}, buildFormData("user@example.org"));

    expect(result).toEqual({ success: SUCCESS_MESSAGE });
    expect(createPasswordResetMock).not.toHaveBeenCalled();
  });

  it("returns the same neutral success message when throttled", async () => {
    getUserForAuthMock.mockResolvedValue({
      id: "user-1",
      status: "active",
      passwordHash: "hash",
    } as Awaited<ReturnType<typeof getUserForAuth>>);
    countRecentPasswordResetsMock.mockResolvedValue(PASSWORD_RESET_MAX_PER_HOUR);

    const result = await requestPasswordResetAction({}, buildFormData("user@example.org"));

    expect(result).toEqual({ success: SUCCESS_MESSAGE });
    expect(createPasswordResetMock).not.toHaveBeenCalled();
  });

  it("stays neutral even when request creation fails", async () => {
    getUserForAuthMock.mockResolvedValue({
      id: "user-1",
      status: "active",
      passwordHash: "hash",
    } as Awaited<ReturnType<typeof getUserForAuth>>);
    createPasswordResetMock.mockRejectedValue(new Error("database down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await requestPasswordResetAction({}, buildFormData("user@example.org"));

    expect(result).toEqual({ success: SUCCESS_MESSAGE });
  });

  it("creates a reset request for a real active account", async () => {
    getUserForAuthMock.mockResolvedValue({
      id: "user-1",
      status: "active",
      passwordHash: "hash",
    } as Awaited<ReturnType<typeof getUserForAuth>>);

    const result = await requestPasswordResetAction({}, buildFormData("user@example.org"));

    expect(result).toEqual({ success: SUCCESS_MESSAGE });
    expect(createPasswordResetMock).toHaveBeenCalledWith({ userId: "user-1" });
  });
});
