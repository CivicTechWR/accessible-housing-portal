/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  consumePasswordResetToken,
  createPasswordReset,
  PasswordResetUnavailableError,
} from "@/lib/auth/password-reset-service";

jest.mock("@/db", () => ({
  db: { transaction: jest.fn() },
}));

jest.mock("@/lib/email-queue/queue", () => ({
  enqueueEmail: jest.fn(),
}));

import { db } from "@/db";
import { openEmailJobSecret } from "@/lib/email-queue/email-job";
import { enqueueEmail } from "@/lib/email-queue/queue";

const enqueueEmailMock = jest.mocked(enqueueEmail);
const transactionMock = db.transaction as unknown as jest.Mock<
  (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>
>;
const ORIGINAL_ENV = process.env;

type InsertValues = Record<string, unknown>;

type TxStub = {
  update: (table: unknown) => unknown;
  insert: (table: unknown) => unknown;
};

/**
 * A drizzle-style update builder stub: `.set().where()` chains resolve when
 * awaited (fire-and-forget updates), and `.returning()` resolves to rows.
 * Based on a real promise so awaiting works without a custom `then`.
 */
function buildUpdateChain(returningRows?: unknown[]) {
  const chain = Promise.resolve(returningRows ?? []) as unknown as {
    set: (values: InsertValues) => unknown;
    where: (condition: unknown) => unknown;
    returning: () => Promise<unknown[]>;
  };

  chain.set = jest.fn((): unknown => chain);
  chain.where = jest.fn((): unknown => chain);
  chain.returning = jest.fn((): Promise<unknown[]> => Promise.resolve(returningRows ?? []));

  return chain;
}

function buildInsertChain(onValues: (values: InsertValues) => void, returningRows: unknown[]) {
  const chain = Promise.resolve(returningRows) as unknown as {
    values: (values: InsertValues) => unknown;
    returning: () => Promise<unknown[]>;
  };

  chain.values = jest.fn((values: InsertValues): unknown => {
    onValues(values);
    return chain;
  });
  chain.returning = jest.fn((): Promise<unknown[]> => Promise.resolve(returningRows));

  return chain;
}

function stubTransaction(tx: Partial<TxStub>) {
  transactionMock.mockImplementation(async (callback) => await callback(tx as TxStub));
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    AUTH_SECRET: "test-auth-secret",
    NEXT_PUBLIC_APP_URL: "https://housing.example.org",
  };
  jest.clearAllMocks();
  enqueueEmailMock.mockResolvedValue("job-1");
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("createPasswordReset", () => {
  it("expires outstanding tokens, inserts a hashed token, and enqueues the email in one transaction", async () => {
    const expiredUpdates: InsertValues[] = [];
    let insertedRow: InsertValues | undefined;
    let enqueuedInTransaction = false;

    const expireChain = buildUpdateChain();
    const originalSet = expireChain.set;
    expireChain.set = (values: InsertValues) => {
      expiredUpdates.push(values);
      return originalSet(values);
    };

    stubTransaction({
      update: () => expireChain,
      insert: () =>
        buildInsertChain(
          (values) => {
            insertedRow = values;
          },
          [{ id: "token-row-1" }],
        ),
    });

    enqueueEmailMock.mockImplementation(async () => {
      enqueuedInTransaction = true;
      return "job-1";
    });

    await createPasswordReset({ userId: "user-1" });

    // Outstanding tokens are expired via expiresAt = now.
    expect(expiredUpdates).toEqual([expect.objectContaining({ expiresAt: expect.any(Date) })]);
    expect(insertedRow?.userId).toBe("user-1");
    expect(insertedRow?.emailQueuedAt).toBeInstanceOf(Date);
    expect(typeof insertedRow?.tokenHash).toBe("string");
    const expiresAt = (insertedRow as InsertValues).expiresAt as Date;
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(enqueuedInTransaction).toBe(true);
  });

  it("never persists the raw token; only its hash", async () => {
    let insertedValues: InsertValues | undefined;
    let jobData: unknown;

    stubTransaction({
      update: () => buildUpdateChain(),
      insert: () =>
        buildInsertChain(
          (values) => {
            insertedValues = values;
          },
          [{ id: "token-row-1" }],
        ),
    });
    enqueueEmailMock.mockImplementation(async (_tx, data) => {
      jobData = data;
      return "job-1";
    });

    await createPasswordReset({ userId: "user-1" });

    const resetUrl = openEmailJobSecret((jobData as { secret: string }).secret);
    const rawToken = new URL(resetUrl).searchParams.get("token") ?? "";
    const expectedHash = createHash("sha256").update(rawToken).digest("hex");

    expect(rawToken).not.toBe("");
    expect(insertedValues?.tokenHash).toBe(expectedHash);
    expect(JSON.stringify(insertedValues)).not.toContain(rawToken);
    expect(resetUrl.startsWith("https://housing.example.org/reset-password?token=")).toBe(true);
  });
});

describe("consumePasswordResetToken", () => {
  function stubConsumption(returningRows: unknown[]) {
    const claimChain = buildUpdateChain(returningRows);
    const updateUserChain = buildUpdateChain();
    const updateTargets: unknown[] = [];

    stubTransaction({
      update: (table) => {
        updateTargets.push(table);
        return updateTargets.length === 1 ? claimChain : updateUserChain;
      },
    });

    return { claimChain, updateUserChain };
  }

  it("rejects unknown tokens", async () => {
    stubConsumption([]);

    await expect(
      consumePasswordResetToken({ token: "unknown-token", passwordHash: "new-hash" }),
    ).rejects.toThrow(PasswordResetUnavailableError);
  });

  it("rejects already-used tokens", async () => {
    stubConsumption([]);

    await expect(
      consumePasswordResetToken({ token: "used-token", passwordHash: "new-hash" }),
    ).rejects.toThrow(PasswordResetUnavailableError);
  });

  it("rejects expired tokens", async () => {
    stubConsumption([]);

    await expect(
      consumePasswordResetToken({ token: "expired-token", passwordHash: "new-hash" }),
    ).rejects.toThrow(PasswordResetUnavailableError);
  });

  it("is single-use under repeated calls", async () => {
    // First call claims the row...
    stubConsumption([{ id: "token-row-1", userId: "user-1" }]);
    await expect(
      consumePasswordResetToken({ token: "valid-token", passwordHash: "new-hash" }),
    ).resolves.toBeUndefined();

    // ...second call finds no claimable row.
    stubConsumption([]);
    await expect(
      consumePasswordResetToken({ token: "valid-token", passwordHash: "another-hash" }),
    ).rejects.toThrow(PasswordResetUnavailableError);
  });

  it("updates the user's password when the token is claimed", async () => {
    const setCalls: InsertValues[] = [];
    const { updateUserChain } = stubConsumption([{ id: "token-row-1", userId: "user-1" }]);
    const originalSet = updateUserChain.set;
    updateUserChain.set = (values: InsertValues) => {
      setCalls.push(values);
      return originalSet(values);
    };

    await consumePasswordResetToken({ token: "valid-token", passwordHash: "new-hash" });

    expect(setCalls).toEqual([{ passwordHash: "new-hash" }]);
  });
});
