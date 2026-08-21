/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import { setNeutralResponseMinMsForTesting } from "@/app/forgot-password/neutral-response";
import { createPasswordReset } from "@/lib/auth/password-reset-service";

jest.mock("@/lib/auth/user-store", () => ({
  getUserForAuth: jest.fn(),
  isUserAllowedToSignIn: (
    jest.requireActual("@/lib/auth/user-store") as typeof import("@/lib/auth/user-store")
  ).isUserAllowedToSignIn,
}));

jest.mock("@/lib/auth/password-reset-service", () => ({
  createPasswordReset: jest.fn(),
  PASSWORD_RESET_MAX_PER_HOUR: 3,
}));

import { getUserForAuth } from "@/lib/auth/user-store";

const getUserForAuthMock = jest.mocked(getUserForAuth);
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
  setNeutralResponseMinMsForTesting(0);
  createPasswordResetMock.mockResolvedValue({ created: true });
});

afterEach(() => {
  setNeutralResponseMinMsForTesting(400);
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

  it("returns the same neutral success message when the per-user throttle blocks creation", async () => {
    getUserForAuthMock.mockResolvedValue({
      id: "user-1",
      status: "active",
      passwordHash: "hash",
    } as Awaited<ReturnType<typeof getUserForAuth>>);
    createPasswordResetMock.mockResolvedValue({ created: false });

    const result = await requestPasswordResetAction({}, buildFormData("user@example.org"));

    expect(result).toEqual({ success: SUCCESS_MESSAGE });
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

  it("pads fast neutral responses to a common minimum duration", async () => {
    getUserForAuthMock.mockResolvedValue(null);
    setNeutralResponseMinMsForTesting(80);

    const startedAt = Date.now();
    await requestPasswordResetAction({}, buildFormData("nobody@example.org"));

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(70);
  });
});
