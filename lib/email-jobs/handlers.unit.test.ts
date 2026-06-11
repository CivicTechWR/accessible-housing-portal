import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { EmailJob } from "@/db/schema";
import { TransactionalEmailProviderError, sendTransactionalEmail } from "@/lib/email";
import { emailJobHandlers } from "@/lib/email-jobs/handlers";
import { encryptSecretContext } from "@/lib/email-jobs/secret-context";

type SelectedInviteRow = {
  invite: {
    id: string;
    email: string;
    acceptedAt: Date | null;
    expiresAt: Date;
  };
  fullName: string;
};

const selectLimitMock = jest.fn<(limit: number) => Promise<SelectedInviteRow[]>>();
const updateWhereMock = jest.fn<(_where: unknown) => Promise<void>>();

jest.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: selectLimitMock,
          }),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: updateWhereMock,
      }),
    }),
  },
}));

jest.mock("@/lib/email", () => {
  class MockTransactionalEmailProviderError extends Error {
    constructor(
      message: string,
      readonly providerCode: string,
      readonly statusCode: number | null,
    ) {
      super(message);
      this.name = "TransactionalEmailProviderError";
    }
  }

  return {
    TransactionalEmailProviderError: MockTransactionalEmailProviderError,
    sendTransactionalEmail: jest.fn(),
  };
});

const sendTransactionalEmailMock = jest.mocked(sendTransactionalEmail);
const INVITE_ID = "2e42f745-44e8-4ab7-a2a2-c1f42cc8e204";
const originalEmailJobSecretKey = process.env.EMAIL_JOB_SECRET_KEY;

function makeJob(): EmailJob {
  return {
    id: "9f5be1de-8b29-44a9-9c25-3a3f6d2e3a01",
    type: "account_invite",
    status: "processing",
    idempotencyKey: `account_invite/${INVITE_ID}`,
    payload: { inviteId: INVITE_ID },
    secretContext: encryptSecretContext({
      inviteUrl: "https://housing.example.org/invite?token=raw-secret-token",
    }),
    recipientEmail: "tenant@example.org",
    attempts: 2,
    maxAttempts: 7,
    runAfter: new Date(),
    claimedAt: new Date(),
    sentAt: null,
    providerMessageId: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EMAIL_JOB_SECRET_KEY = Buffer.alloc(32, 9).toString("base64");
  selectLimitMock.mockResolvedValue([
    {
      invite: {
        id: INVITE_ID,
        email: "tenant@example.org",
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      },
      fullName: "Tenant Example",
    },
  ]);
  updateWhereMock.mockResolvedValue(undefined);
});

afterAll(() => {
  if (originalEmailJobSecretKey === undefined) {
    delete process.env.EMAIL_JOB_SECRET_KEY;
  } else {
    process.env.EMAIL_JOB_SECRET_KEY = originalEmailJobSecretKey;
  }
});

describe("account invite email job handler", () => {
  it("treats a mismatched idempotent replay as a prior successful delivery", async () => {
    sendTransactionalEmailMock.mockRejectedValue(
      new TransactionalEmailProviderError(
        "Same idempotency key used with a different request payload.",
        "invalid_idempotent_request",
        409,
      ),
    );

    await expect(emailJobHandlers.account_invite(makeJob())).resolves.toEqual({
      providerMessageId: null,
    });
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
  });

  it("keeps ordinary provider errors eligible for queue retries", async () => {
    const providerError = new TransactionalEmailProviderError(
      "Resend is unavailable.",
      "application_error",
      500,
    );
    sendTransactionalEmailMock.mockRejectedValue(providerError);

    await expect(emailJobHandlers.account_invite(makeJob())).rejects.toBe(providerError);
    expect(updateWhereMock).not.toHaveBeenCalled();
  });
});
