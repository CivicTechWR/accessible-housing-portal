/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { manageAccountAction } from "./actions";
import { resetEmailContext, type ResetEmailContext } from "@/lib/auth/reset-email-context";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      requestPasswordReset: async () => {
        const context = resetEmailContext.getStore();
        if (context?.userId === userId) context.outcome = mockOutcome;
        // Better Auth returns success even when the callback skips or fails enqueueing.
        return { status: true, message: "If this email exists, check your email." };
      },
    },
  },
}));
jest.mock("@/lib/auth/session", () => ({
  requireAdminSession: async () => ({ authzUser: { id: "admin" } }),
}));
jest.mock("@/lib/auth/invite-service", () => ({ createInvite: jest.fn() }));
jest.mock("@/lib/email-queue/email-job", () => ({ openEmailJobSecret: jest.fn() }));
jest.mock("@/lib/accounts/account.service", () => ({ updateAccountByIdService: jest.fn() }));
jest.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => [
          {
            id: "6d5a1a9a-8f1f-4d1e-9a2e-3b0f5a2c7d11",
            email: "reset@example.test",
            status: "active",
          },
        ],
      }),
    }),
  },
}));

const userId = "6d5a1a9a-8f1f-4d1e-9a2e-3b0f5a2c7d11";
let mockOutcome: ResetEmailContext["outcome"];

beforeEach(() => {
  mockOutcome = undefined;
});

describe("administrator password reset feedback", () => {
  it("reports the account limit instead of claiming an email was queued", async () => {
    mockOutcome = "throttled";
    expect(await manageAccountAction(userId, "reset-password")).toEqual({
      error: "This account has reached its reset email limit. Try again in an hour.",
    });
  });

  it("confirms a queued reset email", async () => {
    mockOutcome = "queued";
    expect(await manageAccountAction(userId, "reset-password")).toEqual({
      message: "Email queued.",
    });
  });

  it("reports failure when the callback never confirms enqueueing", async () => {
    expect(await manageAccountAction(userId, "reset-password")).toEqual({
      error: "Unable to queue the password reset email. Try again.",
    });
  });
});
