/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  consumePasswordResetToken,
  createPasswordReset,
  findUnconsumedPasswordResetToken,
  PASSWORD_RESET_MAX_PER_HOUR,
  PasswordResetUnavailableError,
  updateUserPasswordExpiringResets,
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
  select: (fields: unknown) => unknown;
  update: (table: unknown) => unknown;
  insert: (table: unknown) => unknown;
};

/**
 * A drizzle-style select builder stub: `.from().where().limit().for()` chains
 * resolve to the given rows.
 */
function buildSelectChain(rows: unknown[]) {
  const chain = Promise.resolve(rows) as unknown as {
    from: (table: unknown) => unknown;
    where: (condition: unknown) => unknown;
    limit: (n: number) => unknown;
    for: (lock: string) => unknown;
  };

  chain.from = jest.fn((): unknown => chain);
  chain.where = jest.fn((): unknown => chain);
  // Keep every method returning the same promise-based chain, matching
  // drizzle's order-independent builder (e.g. .limit(1).for("update")).
  chain.limit = jest.fn((): unknown => chain);
  chain.for = jest.fn((): unknown => chain);

  return chain;
}

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
  function buildCreateTransaction(options: {
    userRows?: unknown[];
    recentCount?: number;
    onExpire?: (values: InsertValues) => void;
    onInsert?: (values: InsertValues) => void;
    onEnqueue?: (data: unknown) => void;
  }) {
    const selects: unknown[] = [];
    const expireChain = buildUpdateChain();
    const originalSet = expireChain.set;
    expireChain.set = (values: InsertValues) => {
      options.onExpire?.(values);
      return originalSet(values);
    };

    const tx: TxStub = {
      select: (fields) => {
        selects.push(fields);
        // First select locks the user row; the second counts recent requests.
        return selects.length === 1
          ? buildSelectChain(options.userRows ?? [{ id: "user-1" }])
          : buildSelectChain([{ value: options.recentCount ?? 0 }]);
      },
      update: () => expireChain,
      insert: () =>
        buildInsertChain(
          (values) => {
            options.onInsert?.(values);
          },
          [{ id: "token-row-1" }],
        ),
    };

    transactionMock.mockImplementation(async (callback) => await callback(tx));

    if (options.onEnqueue) {
      enqueueEmailMock.mockImplementation(async (_tx, data) => {
        options.onEnqueue?.(data);
        return "job-1";
      });
    }

    return { selects };
  }

  it("locks the user row, expires outstanding tokens, inserts a hashed token, and enqueues the email", async () => {
    const expiredUpdates: InsertValues[] = [];
    let insertedRow: InsertValues | undefined;
    let enqueuedInTransaction = false;

    buildCreateTransaction({
      onExpire: (values) => expiredUpdates.push(values),
      onInsert: (values) => {
        insertedRow = values;
      },
      onEnqueue: () => {
        enqueuedInTransaction = true;
      },
    });

    const result = await createPasswordReset({ userId: "user-1" });

    expect(result.created).toBe(true);
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

    buildCreateTransaction({
      onInsert: (values) => {
        insertedValues = values;
      },
      onEnqueue: (data) => {
        jobData = data;
      },
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

  it("does not create a request when the per-user throttle is exhausted", async () => {
    const insertSpy = jest.fn();
    const tx = {
      select: (fields: unknown) => {
        void fields;
        return buildSelectChain([{ id: "user-1" }]);
      },
      update: () => buildUpdateChain(),
      insert: () => {
        insertSpy();
        throw new Error("insert must not be reached");
      },
    };
    // Override the second select (recent count) to hit the limit.
    let selectCalls = 0;
    tx.select = (fields: unknown) => {
      selectCalls += 1;
      void fields;
      return selectCalls === 1
        ? buildSelectChain([{ id: "user-1" }])
        : buildSelectChain([{ value: PASSWORD_RESET_MAX_PER_HOUR }]);
    };
    transactionMock.mockImplementation(async (callback) => await callback(tx));

    const result = await createPasswordReset({ userId: "user-1" });

    expect(result.created).toBe(false);
    expect(insertSpy).not.toHaveBeenCalled();
    expect(enqueueEmailMock).not.toHaveBeenCalled();
  });
});

describe("findUnconsumedPasswordResetToken", () => {
  it("returns the row when an unused, unexpired token exists", async () => {
    transactionMock.mockImplementation(async () => "not-a-transaction");
    const dbProxy = db as unknown as { select: unknown };
    const originalSelect = dbProxy.select;
    dbProxy.select = () => buildSelectChain([{ id: "token-row-1" }]);

    try {
      await expect(findUnconsumedPasswordResetToken("raw-token")).resolves.toEqual({
        id: "token-row-1",
      });
    } finally {
      dbProxy.select = originalSelect;
    }
  });

  it("returns null when no unconsumed token matches", async () => {
    transactionMock.mockImplementation(async () => "not-a-transaction");
    const dbProxy = db as unknown as { select: unknown };
    const originalSelect = dbProxy.select;
    dbProxy.select = () => buildSelectChain([]);

    try {
      await expect(findUnconsumedPasswordResetToken("raw-token")).resolves.toBeNull();
    } finally {
      dbProxy.select = originalSelect;
    }
  });
});

describe("consumePasswordResetToken", () => {
  function stubConsumption(returningRows: unknown[]) {
    const claimChain = buildUpdateChain(returningRows);
    const siblingChain = buildUpdateChain();
    const siblingSets: InsertValues[] = [];
    const updateUserChain = buildUpdateChain();
    const updateTargets: unknown[] = [];

    const originalSiblingSet = siblingChain.set;
    siblingChain.set = (values: InsertValues) => {
      siblingSets.push(values);
      return originalSiblingSet(values);
    };

    transactionMock.mockImplementation(
      async (callback) =>
        await callback({
          update: (table: unknown) => {
            updateTargets.push(table);
            if (updateTargets.length === 1) return claimChain;
            if (updateTargets.length === 2) return siblingChain;
            return updateUserChain;
          },
        } as TxStub),
    );

    return { siblingSets, updateUserChain };
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

  it("expires sibling tokens and updates the user's password when the token is claimed", async () => {
    const { siblingSets, updateUserChain } = stubConsumption([
      { id: "token-row-1", userId: "user-1" },
    ]);
    const setCalls: InsertValues[] = [];
    const originalSet = updateUserChain.set;
    updateUserChain.set = (values: InsertValues) => {
      setCalls.push(values);
      return originalSet(values);
    };

    await consumePasswordResetToken({ token: "valid-token", passwordHash: "new-hash" });

    expect(siblingSets).toEqual([expect.objectContaining({ expiresAt: expect.any(Date) })]);
    expect(setCalls).toEqual([{ passwordHash: "new-hash" }]);
  });
});

describe("updateUserPasswordExpiringResets", () => {
  it("updates the password and expires unused reset tokens in one transaction", async () => {
    const userSets: InsertValues[] = [];
    const resetSets: InsertValues[] = [];
    const userChain = buildUpdateChain();
    const resetChain = buildUpdateChain();
    const originalUserSet = userChain.set;
    const originalResetSet = resetChain.set;
    userChain.set = (values: InsertValues) => {
      userSets.push(values);
      return originalUserSet(values);
    };
    resetChain.set = (values: InsertValues) => {
      resetSets.push(values);
      return originalResetSet(values);
    };

    transactionMock.mockImplementation(
      async (callback) =>
        await callback({
          update: (table: unknown) => {
            void table;
            return userSets.length === 0 ? userChain : resetChain;
          },
        } as TxStub),
    );

    await updateUserPasswordExpiringResets({ userId: "user-1", passwordHash: "new-hash" });

    expect(userSets).toEqual([{ passwordHash: "new-hash" }]);
    expect(resetSets).toEqual([expect.objectContaining({ expiresAt: expect.any(Date) })]);
  });
});
