/** @jest-environment node */
import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";
import {
  consumePasswordResetToken,
  PasswordResetUnavailableError,
  updateUserPasswordExpiringResets,
} from "@/lib/auth/password-reset-service";
import { hashOpaqueToken } from "@/lib/auth/token";

jest.mock("@/lib/email-queue/queue", () => ({ enqueueEmail: jest.fn() }));

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase("password reset concurrency", () => {
  const databaseName = `password_reset_test_${randomUUID().replaceAll("-", "")}`;
  const userId = randomUUID();
  const token = "test-reset-token";
  const databaseGlobals = globalThis as typeof globalThis & {
    __ahpDatabase?: ReturnType<typeof drizzle<typeof schema>>;
  };
  const originalDatabase = databaseGlobals.__ahpDatabase;
  let admin: ReturnType<typeof postgres>;
  let resetSql: ReturnType<typeof postgres>;
  let accountSql: ReturnType<typeof postgres>;
  let controlSql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required.");
    admin = postgres(testDatabaseUrl, { max: 1 });
    await admin`CREATE DATABASE ${admin(databaseName)}`;
    const databaseUrl = new URL(testDatabaseUrl);
    databaseUrl.pathname = `/${databaseName}`;
    const options = { max: 1, prepare: false };
    resetSql = postgres(databaseUrl.toString(), options);
    accountSql = postgres(databaseUrl.toString(), options);
    controlSql = postgres(databaseUrl.toString(), options);
    await migrate(drizzle(controlSql), { migrationsFolder: "drizzle" });
  }, 30_000);

  beforeEach(async () => {
    const db = drizzle(controlSql);
    await db.insert(schema.users).values({
      id: userId,
      email: "reset-test@example.org",
      fullName: "Password reset test",
      passwordHash: "original-password",
      role: "user",
      status: "active",
    });
    await db.insert(schema.passwordResetTokens).values({
      userId,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });
  });

  afterEach(async () => {
    await controlSql`DELETE FROM users WHERE id = ${userId}`;
  });

  afterAll(async () => {
    databaseGlobals.__ahpDatabase = originalDatabase;
    await Promise.all([
      resetSql?.end({ timeout: 1 }),
      accountSql?.end({ timeout: 1 }),
      controlSql?.end({ timeout: 1 }),
    ]);
    if (admin) {
      await admin`DROP DATABASE IF EXISTS ${admin(databaseName)} WITH (FORCE)`;
      await admin.end();
    }
  });

  it("rejects a link revoked while consumption waits for a connection", async () => {
    const reservedConnection = await resetSql.reserve();
    databaseGlobals.__ahpDatabase = drizzle(resetSql, { schema });
    const result = Promise.allSettled([
      consumePasswordResetToken({ token, passwordHash: "reset-overwrite" }),
    ]);

    try {
      // The request has started, but its single pooled connection is occupied.
      await new Promise((resolve) => setTimeout(resolve, 20));
      databaseGlobals.__ahpDatabase = drizzle(accountSql, { schema });
      await updateUserPasswordExpiringResets({ userId, passwordHash: "account-password" });
    } finally {
      reservedConnection.release();
    }

    expect(await result).toEqual([
      { status: "rejected", reason: expect.any(PasswordResetUnavailableError) },
    ]);
    const [user] = await controlSql`SELECT password_hash FROM users WHERE id = ${userId}`;
    expect(user?.password_hash).toBe("account-password");
    const [reset] =
      await controlSql`SELECT used_at FROM password_reset_tokens WHERE user_id = ${userId}`;
    expect(reset?.used_at).toBeNull();
  });

  it("serializes reset consumption and account password changes without a deadlock", async () => {
    // Pause consumption after it locks the token, so the competing password
    // change reaches its first blocked row before consumption continues.
    await controlSql.unsafe(`
      CREATE FUNCTION pause_reset_claim() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.used_at IS NOT NULL AND OLD.used_at IS NULL THEN
          PERFORM pg_advisory_xact_lock(409);
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER pause_claim BEFORE UPDATE ON password_reset_tokens
        FOR EACH ROW EXECUTE FUNCTION pause_reset_claim();
    `);
    await controlSql`SELECT pg_advisory_lock(409)`;
    const [resetConnection] = await resetSql`SELECT pg_backend_pid() AS pid`;
    const [accountConnection] = await accountSql`SELECT pg_backend_pid() AS pid`;

    if (!resetConnection || !accountConnection) throw new Error("Missing database connection.");

    databaseGlobals.__ahpDatabase = drizzle(resetSql, { schema });
    const resetResult = Promise.allSettled([
      consumePasswordResetToken({ token, passwordHash: "reset-password" }),
    ]);
    let accountResult: typeof resetResult | undefined;
    try {
      await waitForLock(resetConnection.pid, "advisory");
      databaseGlobals.__ahpDatabase = drizzle(accountSql, { schema });
      accountResult = Promise.allSettled([
        updateUserPasswordExpiringResets({ userId, passwordHash: "account-password" }),
      ]);
      await waitForLock(accountConnection.pid, "transactionid");
    } finally {
      await controlSql`SELECT pg_advisory_unlock(409)`;
    }

    expect(await resetResult).toEqual([{ status: "fulfilled", value: undefined }]);
    expect(await accountResult).toEqual([{ status: "fulfilled", value: undefined }]);
    const [user] = await controlSql`SELECT password_hash FROM users WHERE id = ${userId}`;
    expect(user?.password_hash).toBe("account-password");
  });

  async function waitForLock(pid: number, event: string) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const [activity] =
        await controlSql`SELECT wait_event FROM pg_stat_activity WHERE pid = ${pid}`;
      if (activity?.wait_event === event) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Connection ${pid} did not wait for ${event}.`);
  }
});
