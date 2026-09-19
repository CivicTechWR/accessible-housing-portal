import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { setTimeout } from "node:timers/promises";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { hashPassword } from "better-auth/crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import nextServer from "next/server";

import { POST } from "@/app/api/auth/[...all]/route";
import { db } from "@/db";
import {
  accounts,
  authRateLimits,
  emailDeliveries,
  emailDeliveryAttempts,
  sessions,
  userInvites,
  users,
  verifications,
} from "@/db/schema";
import { updateAccountById } from "@/lib/accounts/account.repository";
import { auth, createAuth } from "@/lib/auth";
import { createInvite } from "@/lib/auth/invite-service";
import { resetEmailContext, type ResetEmailContext } from "@/lib/auth/reset-email-context";
import { hashOpaqueToken } from "@/lib/auth/token";
import { openEmailJobSecret, type EmailJobData } from "@/lib/email-queue/email-job";
import { getEmailQueue, EMAIL_QUEUE } from "@/lib/email-queue/queue";
import { processEmailJob } from "@/lib/email-queue/worker";
import type { PgBoss } from "pg-boss";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const password = "Integration-password-416!";
const userIds: string[] = [];
const rateLimitKeys: string[] = [];
const backgroundTasks: Promise<unknown>[] = [];
let captureDir: string;
let boss: PgBoss | undefined;

function request(path: string, body: unknown, ip: string, cookie = "") {
  rateLimitKeys.push(`${ip}|/${path}`);
  return new Request(`http://localhost:3000/api/auth/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      "x-real-ip": ip,
      cookie,
    },
    body: JSON.stringify(body),
  });
}

async function createUser(status: "active" | "invited") {
  const id = crypto.randomUUID();
  const email = `${id}@example.test`;
  userIds.push(id);
  await db.insert(users).values({
    id,
    email,
    fullName: "Integration user",
    role: "user",
    status,
    emailVerified: status === "active",
    inviteAcceptedAt: status === "active" ? new Date() : null,
  });
  await db.insert(accounts).values({
    userId: id,
    accountId: id,
    providerId: "credential",
    issuer: "local:credential",
    password: await hashPassword(password),
  });
  return { id, email };
}

async function waitForUserLocks(count: number) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const [row] = await db.execute<{ count: number }>(sql`
      select count(*)::int as count from pg_stat_activity
      where datname = current_database()
        and wait_event_type = 'Lock' and query like '%users%'
    `);
    if (row && row.count >= count) return;
    await setTimeout(20);
  }
  assert.fail(`Expected ${count} requests waiting on the user row`);
}

async function createResetToken(userId: string) {
  const token = crypto.randomUUID();
  await (
    await auth.$context
  ).internalAdapter.createVerificationValue({
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + 60_000),
  });
  return token;
}

async function raceAuthRequests(
  userId: string,
  first: () => Promise<Response>,
  second: () => Promise<Response>,
) {
  const locked = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const blocker = db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    locked.resolve();
    await release.promise;
  });
  let firstResponse: Promise<Response> | undefined;
  let secondResponse: Promise<Response> | undefined;
  try {
    await Promise.race([locked.promise, blocker]);
    firstResponse = first();
    await waitForUserLocks(1);
    secondResponse = second();
    await waitForUserLocks(2);
  } finally {
    release.resolve();
    await Promise.allSettled([blocker, firstResponse, secondResponse]);
  }
  return Promise.all([firstResponse, secondResponse]);
}

describe("account security with PostgreSQL", { skip: !testDatabaseUrl }, () => {
  before(async () => {
    assert.ok(testDatabaseUrl);
    captureDir = await mkdtemp(join(tmpdir(), "auth-security-email-"));
    Object.assign(process.env, {
      DATABASE_URL: testDatabaseUrl,
      NODE_ENV: "test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "integration-test-secret-416-not-for-production",
      EMAIL_JOB_SECRET: "integration-email-secret-416-not-for-production",
      EMAIL_TRANSPORT: "capture",
      EMAIL_CAPTURE_DIR: captureDir,
      EMAIL_WORKER_ENABLED: "false",
    });
    await migrate(db, { migrationsFolder: "./drizzle" });
    // Direct route calls lack Next's request scope. Capture only its after-response scheduler.
    mock.method(nextServer, "after", (task: Parameters<typeof nextServer.after>[0]) => {
      backgroundTasks.push(typeof task === "function" ? Promise.resolve().then(task) : task);
    });
  });

  after(async () => {
    await Promise.allSettled(backgroundTasks);
    try {
      if (userIds.length) {
        if (boss) {
          const jobs = await db.execute<{ data: EmailJobData }>(sql`
            delete from pgboss.job
            where ${inArray(sql`data->>'userId'`, userIds)} returning data
          `);
          const deliveryIds = jobs.map((job) => job.data.attempt.deliveryId);
          if (deliveryIds.length) {
            await db.delete(emailDeliveries).where(inArray(emailDeliveries.id, deliveryIds));
          }
        }
        await db.delete(verifications).where(inArray(verifications.value, userIds));
        await db.delete(users).where(inArray(users.id, userIds));
      }
      if (rateLimitKeys.length) {
        await db.delete(authRateLimits).where(inArray(authRateLimits.key, rateLimitKeys));
      }
    } finally {
      mock.restoreAll();
      await boss?.stop();
      await db.$client.end();
      if (captureDir) await rm(captureDir, { recursive: true, force: true });
    }
  });

  it("rate limits wrong passwords without creating a session", async () => {
    const user = await createUser("active");
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await POST(
        request(
          "sign-in/email",
          { email: user.email, password: "Incorrect-password-416!" },
          "192.0.2.216",
        ),
      );
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
    assert.equal((await db.select().from(sessions).where(eq(sessions.userId, user.id))).length, 0);
  });

  it("rate limits rejected password changes and retires reset links only on success", async () => {
    const user = await createUser("active");
    const signIn = await POST(
      request("sign-in/email", { email: user.email, password }, "192.0.2.218"),
    );
    assert.equal(signIn.status, 200);
    const cookie = signIn.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    const identifier = `reset-password:${crypto.randomUUID()}`;
    const context = await auth.$context;
    await context.internalAdapter.createVerificationValue({
      identifier,
      value: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const statuses: number[] = [];
    const newPassword = "Changed-integration-password-416!";
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await POST(
        request(
          "change-password",
          { currentPassword: "Incorrect-password-416!", newPassword },
          "192.0.2.218",
          cookie,
        ),
      );
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, [400, 400, 400, 429, 429]);
    assert.ok(await context.internalAdapter.findVerificationValue(identifier));

    const changed = await POST(
      request("change-password", { currentPassword: password, newPassword }, "192.0.2.219", cookie),
    );
    assert.equal(changed.status, 200);
    assert.equal(await context.internalAdapter.findVerificationValue(identifier), null);
  });

  it("rejects an invited status update waiting behind invitation acceptance", async () => {
    const user = await createUser("invited");
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60_000);
    await (
      await auth.$context
    ).internalAdapter.createVerificationValue({
      identifier: `reset-password:${token}`,
      value: user.id,
      expiresAt,
    });
    await db.insert(userInvites).values({
      userId: user.id,
      email: user.email,
      tokenHash: hashOpaqueToken(token),
      expiresAt,
    });

    const locked = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const blocker = db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for("update");
      locked.resolve();
      await release.promise;
    });
    let acceptance: Promise<Response> | undefined;
    let update: ReturnType<typeof updateAccountById> | undefined;
    try {
      await Promise.race([locked.promise, blocker]);
      acceptance = POST(request("reset-password", { token, newPassword: password }, "192.0.2.217"));
      await waitForUserLocks(1);
      update = updateAccountById({ accountId: user.id, status: "invited", name: "Admin edit" });
      await waitForUserLocks(2);
    } finally {
      release.resolve();
      await Promise.allSettled([blocker, acceptance, update]);
    }

    assert.equal((await acceptance)?.status, 200);
    assert.deepEqual(await update, {
      ok: false,
      error: {
        code: "conflict",
        message:
          "This account already accepted its invitation and cannot return to invited. Restore active instead.",
      },
    });
    const [saved] = await db.select().from(users).where(eq(users.id, user.id));
    assert.equal(saved?.status, "active");
    assert.ok(saved.inviteAcceptedAt);
    assert.equal(saved.fullName, "Integration user");
  });

  for (const operation of ["sign-in", "change-password"] as const) {
    for (const resetFirst of [true, false]) {
      it(`serializes reset and ${operation} with ${resetFirst ? "reset" : operation} first`, async () => {
        const user = await createUser("active");
        const signIn = await POST(
          request("sign-in/email", { email: user.email, password }, "192.0.2.220"),
        );
        assert.equal(signIn.status, 200);
        const cookie = signIn.headers
          .getSetCookie()
          .map((value) => value.split(";")[0])
          .join("; ");
        const token = await createResetToken(user.id);
        const sibling = await createResetToken(user.id);
        const resetPassword = "Reset-integration-password-416!";
        const changedPassword = "Changed-integration-password-416!";
        const reset = () =>
          POST(request("reset-password", { token, newPassword: resetPassword }, "192.0.2.221"));
        const other =
          operation === "sign-in"
            ? () => POST(request("sign-in/email", { email: user.email, password }, "192.0.2.222"))
            : () =>
                POST(
                  request(
                    "change-password",
                    {
                      currentPassword: password,
                      newPassword: changedPassword,
                      revokeOtherSessions: true,
                    },
                    "192.0.2.223",
                    cookie,
                  ),
                );
        const responses = await raceAuthRequests(
          user.id,
          resetFirst ? reset : other,
          resetFirst ? other : reset,
        );
        assert.equal(responses[0]!.status, 200);
        assert.equal(responses[1]!.status, resetFirst ? 401 : operation === "sign-in" ? 200 : 400);
        const [credential] = await db.select().from(accounts).where(eq(accounts.userId, user.id));
        assert.ok(credential?.password);
        const context = await auth.$context;
        assert.ok(
          await context.password.verify({
            hash: credential.password,
            password:
              !resetFirst && operation === "change-password" ? changedPassword : resetPassword,
          }),
        );
        assert.equal(
          await context.internalAdapter.findVerificationValue(`reset-password:${sibling}`),
          null,
        );
        const remaining = await db.select().from(sessions).where(eq(sessions.userId, user.id));
        assert.equal(remaining.length, !resetFirst && operation === "change-password" ? 1 : 0);
        await db.delete(authRateLimits).where(inArray(authRateLimits.key, rateLimitKeys));
      });
    }
  }

  for (const factor of ["verify-totp", "verify-backup-code"] as const) {
    for (const resetFirst of [true, false]) {
      it(`serializes ${factor} and reset with ${resetFirst ? "reset" : "verification"} first`, async () => {
        const user = await createUser("active");
        const cookies = (response: Response) =>
          response.headers
            .getSetCookie()
            .map((value) => value.split(";")[0])
            .join("; ");
        const signedIn = await POST(
          request("sign-in/email", { email: user.email, password }, "192.0.2.230"),
        );
        assert.equal(signedIn.status, 200);
        const sessionCookie = cookies(signedIn);
        const enabled = await POST(
          request("two-factor/enable", { password }, "192.0.2.230", sessionCookie),
        );
        assert.equal(enabled.status, 200);
        const setup = await enabled.json();
        const secret = new URL(setup.totpURI).searchParams.get("secret");
        assert.ok(secret);
        const code = () => createOTP(new TextDecoder().decode(base32.decode(secret))).totp();
        const confirmed = await POST(
          request("two-factor/verify-totp", { code: await code() }, "192.0.2.230", sessionCookie),
        );
        assert.equal(confirmed.status, 200);
        const pending = await POST(
          request("sign-in/email", { email: user.email, password }, "192.0.2.231"),
        );
        assert.equal(pending.status, 200);
        assert.equal((await pending.json()).twoFactorRedirect, true);
        const challengeCookie = cookies(pending);
        const token = await createResetToken(user.id);
        const reset = () =>
          POST(
            request(
              "reset-password",
              { token, newPassword: "Reset-two-factor-password" },
              "192.0.2.232",
            ),
          );
        const verify = async () =>
          POST(
            request(
              `two-factor/${factor}`,
              { code: factor === "verify-totp" ? await code() : setup.backupCodes[0] },
              "192.0.2.233",
              challengeCookie,
            ),
          );
        const responses = await raceAuthRequests(
          user.id,
          resetFirst ? reset : verify,
          resetFirst ? verify : reset,
        );
        assert.equal(responses[0]!.status, 200);
        assert.equal(responses[1]!.status, resetFirst ? 401 : 200);
        assert.equal(
          (await db.select().from(sessions).where(eq(sessions.userId, user.id))).length,
          0,
        );
        if (!resetFirst) {
          const revoked = await auth.api.getSession({
            headers: new Headers({ cookie: cookies(responses[0]!) }),
          });
          assert.equal(revoked, null);
        }
        await db.delete(authRateLimits).where(inArray(authRateLimits.key, rateLimitKeys));
      });
    }
  }

  it("consumes a reset link once when two resets arrive together", async () => {
    const user = await createUser("active");
    const token = await createResetToken(user.id);
    const responses = await raceAuthRequests(
      user.id,
      () =>
        POST(
          request("reset-password", { token, newPassword: "First-reset-password" }, "192.0.2.224"),
        ),
      () =>
        POST(
          request("reset-password", { token, newPassword: "Second-reset-password" }, "192.0.2.225"),
        ),
    );
    assert.deepEqual(
      responses.map((response) => response.status),
      [200, 400],
    );
  });

  it("returns public reset responses before email queuing and skips links retired by a reset", async () => {
    boss = await getEmailQueue();
    const user = await createUser("active");
    const backgroundAuth = createAuth(db, {
      handler: (task) => {
        backgroundTasks.push(task);
      },
    });
    const locked = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const blocker = db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for("update");
      locked.resolve();
      await release.promise;
    });
    try {
      await Promise.race([locked.promise, blocker]);
      const response = await Promise.race([
        backgroundAuth.handler(
          request("request-password-reset", { email: user.email }, "192.0.2.226"),
        ),
        setTimeout(2_000).then(() => {
          throw new Error("Reset response waited for the email queue lock");
        }),
      ]);
      assert.equal(response.status, 200);
      await waitForUserLocks(1);
    } finally {
      release.resolve();
      await blocker;
      await Promise.all(backgroundTasks);
    }
    const queued = await boss.fetch<EmailJobData>(EMAIL_QUEUE);
    assert.equal(queued.length, 1);
    const job = queued[0]!;
    assert.equal(job.data.type, "password_reset");
    const token = new URL(openEmailJobSecret(job.data.secret)).searchParams.get("token");
    assert.ok(token);
    assert.equal(
      (
        await POST(
          request(
            "reset-password",
            { token, newPassword: "Reset-integration-password" },
            "192.0.2.227",
          ),
        )
      ).status,
      200,
    );
    const beforeEmails = await readdir(captureDir);
    const result = await processEmailJob(boss, { ...job, signal: new AbortController().signal });
    assert.deepEqual(result, { status: "skipped", reason: "reset_unavailable" });
    assert.deepEqual(await readdir(captureDir), beforeEmails);

    await backgroundAuth.handler(
      request("request-password-reset", { email: user.email }, "192.0.2.228"),
    );
    await Promise.all(backgroundTasks);
    const [validJob] = await boss.fetch<EmailJobData>(EMAIL_QUEUE);
    assert.ok(validJob);
    assert.equal(
      (await processEmailJob(boss, { ...validJob, signal: new AbortController().signal })).status,
      "submitted",
    );
    assert.equal((await readdir(captureDir)).length, beforeEmails.length + 1);
  });

  it("limits public resets across addresses and resumes after the IP window expires", async () => {
    boss = await getEmailQueue();
    const user = await createUser("active");
    const ip = "192.0.2.180";
    let attempt = 0;
    const submit = (email: string) => {
      const req = request("request-password-reset", { email }, ip);
      // These caller-controlled headers must not change the trusted edge IP's budget.
      attempt++;
      req.headers.set("x-forwarded-for", `198.51.100.${attempt}`);
      req.headers.set("forwarded", `for=198.51.100.${attempt}`);
      req.headers.set("cf-connecting-ip", `203.0.113.${attempt}`);
      return POST(req);
    };
    const accepted = await submit(user.email);
    assert.equal(accepted.status, 200);
    const neutral = await accepted.json();
    for (const email of ["unknown-ip-one@example.test", "unknown-ip-two@example.test"]) {
      const response = await submit(email);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), neutral);
    }
    const [budget] = await db
      .select()
      .from(authRateLimits)
      .where(eq(authRateLimits.key, `${ip}|/request-password-reset`));
    assert.ok(budget);
    for (const email of [user.email, "unknown-ip-blocked@example.test"]) {
      const response = await submit(email);
      assert.equal(response.status, 429);
      assert.deepEqual(await response.json(), {
        message: "Too many requests. Please try again later.",
      });
      const retryAfter = Number(response.headers.get("x-retry-after"));
      assert.ok(retryAfter > 0 && retryAfter <= 60);
    }
    await Promise.all(backgroundTasks);
    assert.equal(
      (await db.select().from(verifications).where(eq(verifications.value, user.id))).length,
      1,
    );
    const queued = await db.execute<{ count: number }>(sql`
      select count(*)::int as count from pgboss.job
      where data->>'userId' = ${user.id} and data->>'type' = 'password_reset'
    `);
    assert.equal(queued[0]?.count, 1);
    const [blockedBudget] = await db
      .select()
      .from(authRateLimits)
      .where(eq(authRateLimits.key, budget.key));
    assert.equal(blockedBudget?.lastRequest, budget.lastRequest);

    const otherIp = await POST(
      request("request-password-reset", { email: user.email }, "192.0.2.181"),
    );
    assert.equal(otherIp.status, 200);
    await db
      .update(authRateLimits)
      .set({ lastRequest: Date.now() - 60_001 })
      .where(eq(authRateLimits.key, budget.key));
    const resumed = await submit(user.email);
    assert.equal(resumed.status, 200);
    assert.deepEqual(await resumed.json(), neutral);
    await Promise.all(backgroundTasks);
    assert.equal(
      (await db.select().from(verifications).where(eq(verifications.value, user.id))).length,
      3,
    );
    const afterWindow = await db.execute<{ count: number }>(sql`
      select count(*)::int as count from pgboss.job
      where data->>'userId' = ${user.id} and data->>'type' = 'password_reset'
    `);
    assert.equal(afterWindow[0]?.count, 3);
  });

  it("shares the public reset budget across concurrent auth instances", async () => {
    boss = await getEmailQueue();
    const targets = await Promise.all(Array.from({ length: 6 }, () => createUser("active")));
    // Each POST constructs a new auth instance, all backed by the real database.
    const responses = await Promise.all(
      targets.map((user) =>
        POST(request("request-password-reset", { email: user.email }, "192.0.2.182")),
      ),
    );
    assert.deepEqual(
      responses.map((response) => response.status).sort(),
      [200, 200, 200, 429, 429, 429],
    );
    await Promise.all(backgroundTasks);
    for (const [index, user] of targets.entries()) {
      const expected = responses[index]!.status === 200 ? 1 : 0;
      assert.equal(
        (await db.select().from(verifications).where(eq(verifications.value, user.id))).length,
        expected,
      );
      const queued = await db.execute<{ count: number }>(sql`
        select count(*)::int as count from pgboss.job
        where data->>'userId' = ${user.id} and data->>'type' = 'password_reset'
      `);
      assert.equal(queued[0]?.count, expected);
    }
  });

  it("allows only one concurrent reset when the IP has one request left", async () => {
    boss = await getEmailQueue();
    const targets = await Promise.all(Array.from({ length: 2 }, () => createUser("active")));
    const ip = "192.0.2.183";
    const key = `${ip}|/request-password-reset`;
    for (let index = 0; index < 2; index++) {
      const response = await POST(
        request("request-password-reset", { email: `budget-${index}@example.test` }, ip),
      );
      assert.equal(response.status, 200);
    }

    const locked = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const blocker = db.transaction(async (tx) => {
      await tx
        .select({ id: authRateLimits.id })
        .from(authRateLimits)
        .where(eq(authRateLimits.key, key))
        .for("update");
      locked.resolve();
      await release.promise;
    });
    let pending: Promise<Response>[] = [];
    try {
      await Promise.race([locked.promise, blocker]);
      pending = targets.map((user) =>
        POST(request("request-password-reset", { email: user.email }, ip)),
      );
      // Both requests must reach the counter before either can take the last slot.
      const deadline = Date.now() + 5_000;
      let waiting = 0;
      while (Date.now() < deadline) {
        const [row] = await db.execute<{ count: number }>(sql`
          select count(*)::int as count from pg_stat_activity
          where datname = current_database()
            and wait_event_type = 'Lock' and query like '%auth_rate_limits%'
        `);
        waiting = row?.count ?? 0;
        if (waiting >= 2) break;
        await setTimeout(20);
      }
      assert.equal(waiting, 2);
    } finally {
      release.resolve();
      await Promise.allSettled([blocker, ...pending]);
    }
    const responses = await Promise.all(pending);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 429]);
    await Promise.all(backgroundTasks);
    for (const [index, user] of targets.entries()) {
      const expected = responses[index]!.status === 200 ? 1 : 0;
      assert.equal(
        (await db.select().from(verifications).where(eq(verifications.value, user.id))).length,
        expected,
      );
      const queued = await db.execute<{ count: number }>(sql`
        select count(*)::int as count from pgboss.job
        where data->>'userId' = ${user.id} and data->>'type' = 'password_reset'
      `);
      assert.equal(queued[0]?.count, expected);
    }
  });

  it("shares a fallback reset budget when the trusted IP is missing or invalid", async () => {
    rateLimitKeys.push(
      "no-trusted-ip|/request-password-reset",
      "127.0.0.1|/request-password-reset",
    );
    const statuses: number[] = [];
    for (const [index, ip] of ["", "invalid", "192.0.2.1, 192.0.2.2", "", "invalid"].entries()) {
      const req = request(
        "request-password-reset",
        { email: `missing-ip-${index}@example.test` },
        ip,
      );
      if (!ip) req.headers.delete("x-real-ip");
      req.headers.set("x-forwarded-for", `198.51.100.${index + 1}`);
      req.headers.set("forwarded", `for=198.51.100.${index + 1}`);
      req.headers.set("cf-connecting-ip", `198.51.100.${index + 1}`);
      statuses.push((await POST(req)).status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  });

  it("limits reset emails across IPs and resumes after the account window expires", async () => {
    boss = await getEmailQueue();
    const user = await createUser("active");
    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        POST(request("request-password-reset", { email: user.email }, `192.0.2.${240 + index}`)),
      ),
    );
    const unknown = await POST(
      request("request-password-reset", { email: "unknown-reset@example.test" }, "192.0.2.245"),
    );
    assert.equal(unknown.status, 200);
    const neutral = await unknown.json();
    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), neutral);
    }
    await Promise.all(backgroundTasks);
    const queued = await db.execute<{ count: number }>(sql`
      select count(*)::int as count from pgboss.job
      where data->>'userId' = ${user.id} and data->>'type' = 'password_reset'
    `);
    assert.equal(queued[0]?.count, 3);

    // A successful reset must not give the account a fresh email budget.
    const token = await createResetToken(user.id);
    assert.equal(
      (
        await POST(
          request(
            "reset-password",
            { token, newPassword: "Reset-throttled-account-password" },
            "192.0.2.246",
          ),
        )
      ).status,
      200,
    );
    await POST(request("request-password-reset", { email: user.email }, "192.0.2.247"));
    await Promise.all(backgroundTasks);
    const afterReset = await db.execute<{ count: number }>(sql`
      select count(*)::int as count from pgboss.job
      where data->>'userId' = ${user.id} and data->>'type' = 'password_reset'
    `);
    assert.equal(afterReset[0]?.count, 3);

    const adminReset: ResetEmailContext = { userId: user.id };
    await resetEmailContext.run(adminReset, () =>
      auth.api.requestPasswordReset({ body: { email: user.email } }),
    );
    assert.equal(adminReset.outcome, "throttled");

    const [delivery] = await db
      .select()
      .from(emailDeliveries)
      .where(eq(emailDeliveries.sourceEntityId, user.id));
    assert.ok(delivery);
    await db
      .update(emailDeliveryAttempts)
      .set({ createdAt: new Date(Date.now() - 3_600_001) })
      .where(eq(emailDeliveryAttempts.deliveryId, delivery.id));
    const resumed = await POST(
      request("request-password-reset", { email: user.email }, "192.0.2.248"),
    );
    assert.equal(resumed.status, 200);
    await Promise.all(backgroundTasks);
    const afterWindow = await db.execute<{ count: number }>(sql`
      select count(*)::int as count from pgboss.job
      where data->>'userId' = ${user.id} and data->>'type' = 'password_reset'
    `);
    assert.equal(afterWindow[0]?.count, 4);

    const resumedAdminReset: ResetEmailContext = { userId: user.id };
    await resetEmailContext.run(resumedAdminReset, () =>
      auth.api.requestPasswordReset({ body: { email: user.email } }),
    );
    assert.equal(resumedAdminReset.outcome, "queued");
    const afterAdminReset = await db.execute<{ count: number }>(sql`
      select count(*)::int as count from pgboss.job
      where data->>'userId' = ${user.id} and data->>'type' = 'password_reset'
    `);
    assert.equal(afterAdminReset[0]?.count, 5);
  });

  it("awaits invitation creation and returns its usable link", async () => {
    boss = await getEmailQueue();
    const admin = await createUser("active");
    const invited = await createUser("invited");
    const result = await createInvite({
      email: invited.email,
      fullName: "Invited user",
      role: "user",
      organization: null,
      invitedByUserId: admin.id,
      sendInviteEmail: false,
    });
    const token = new URL(result.inviteUrl).searchParams.get("token");
    assert.ok(token);
    assert.ok(result.inviteId);
    assert.equal(
      (
        await POST(
          request(
            "reset-password",
            { token, newPassword: "Invitation-password-416" },
            "192.0.2.229",
          ),
        )
      ).status,
      200,
    );
  });
});
