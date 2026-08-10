/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { startEmailDeliveryAttempt, type EmailDeliveryDatabase } from "@/lib/email-delivery/store";

jest.mock("@/db", () => ({ db: {} }));

const DELIVERY_ID = "6d5a1a9a-8f1f-4d1e-9a2e-3b0f5a2c7d11";
const ATTEMPT_ID = "0f5cce0c-92e5-4ab0-a06d-21c5a8f4ff79";
const INVITE_ID = "2e42f745-44e8-4ab7-a2a2-c1f42cc8e204";

let insertedAttempt: Record<string, unknown> | undefined;
let latestAttemptNumber: number | undefined;

/**
 * Minimal stand-in for the drizzle query builders `startEmailDeliveryAttempt`
 * uses: the delivery upsert, the highest existing attempt number, and the
 * attempt insert.
 */
const tx = {
  insert: () => ({
    values: (values: Record<string, unknown>) => ({
      onConflictDoUpdate: () => ({ returning: async () => [{ id: DELIVERY_ID }] }),
      returning: async () => {
        insertedAttempt = values;
        return [{ id: ATTEMPT_ID }];
      },
    }),
  }),
  select: () => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: async () =>
            latestAttemptNumber === undefined ? [] : [{ attemptNumber: latestAttemptNumber }],
        }),
      }),
    }),
  }),
} as unknown as EmailDeliveryDatabase;

beforeEach(() => {
  insertedAttempt = undefined;
  latestAttemptNumber = undefined;
});

describe("startEmailDeliveryAttempt", () => {
  it("opens the first attempt with an attempt-scoped idempotency key", async () => {
    const attempt = await startEmailDeliveryAttempt(tx, {
      emailType: "account_invite",
      sourceEntityId: INVITE_ID,
    });

    expect(attempt).toEqual({
      id: ATTEMPT_ID,
      deliveryId: DELIVERY_ID,
      emailType: "account_invite",
      attemptNumber: 1,
      idempotencyKey: `account_invite/${INVITE_ID}/attempt/1`,
    });
    expect(insertedAttempt).toEqual({
      deliveryId: DELIVERY_ID,
      attemptNumber: 1,
      idempotencyKey: `account_invite/${INVITE_ID}/attempt/1`,
    });
  });

  it("gives a resend of the same delivery a new attempt number and idempotency key", async () => {
    latestAttemptNumber = 2;

    const attempt = await startEmailDeliveryAttempt(tx, {
      emailType: "account_invite",
      sourceEntityId: INVITE_ID,
    });

    expect(attempt.deliveryId).toBe(DELIVERY_ID);
    expect(attempt.attemptNumber).toBe(3);
    expect(attempt.idempotencyKey).toBe(`account_invite/${INVITE_ID}/attempt/3`);
  });
});
