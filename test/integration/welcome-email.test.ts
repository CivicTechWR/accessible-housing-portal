import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it, mock } from "node:test";
import { eq, inArray, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Job, PgBoss } from "pg-boss";

import { db } from "@/db";
import {
  emailDeliveries,
  emailDeliveryAttempts,
  userInvites,
  users,
  verifications,
} from "@/db/schema";
import { createInvite } from "@/lib/auth/invite-service";
import { sendWelcomeEmail } from "@/lib/auth/welcome-email";
import type { AccountInviteEmailJobData } from "@/lib/email-queue/email-job";
import { EMAIL_QUEUE, getEmailQueue } from "@/lib/email-queue/queue";
import { processDeadLetteredEmailJob, processEmailJob } from "@/lib/email-queue/worker";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const userIds: string[] = [];
const inviteIds: string[] = [];
let captureDir: string;
let adminId: string;
let boss: PgBoss | undefined;

async function invite(email: string, role: "user" | "partner", fullName = "Avery") {
  const result = await createInvite({
    email,
    fullName,
    role,
    organization: null,
    invitedByUserId: adminId,
    sendInviteEmail: true,
  });
  userIds.push(result.userId);
  inviteIds.push(result.inviteId);
  const [row] = await db.execute<{ id: string; name: string; data: AccountInviteEmailJobData }>(sql`
    select id, name, data from pgboss.job
    where name = ${EMAIL_QUEUE} and data->>'inviteId' = ${result.inviteId}
  `);
  assert.ok(row);
  const job = { ...row, signal: new AbortController().signal } as Job<AccountInviteEmailJobData>;
  assert.ok(job.data.welcomeAttempt);
  return { result, job, welcomeAttempt: job.data.welcomeAttempt };
}

type ProviderMessage = { subject: string; text: string };

async function withIdempotentProvider(
  run: (provider: {
    accepted: Map<string, { body: string; message: ProviderMessage; id: string }>;
    onAccepted?: (key: string) => Promise<void>;
  }) => Promise<void>,
) {
  const provider = {
    accepted: new Map<string, { body: string; message: ProviderMessage; id: string }>(),
    onAccepted: undefined as ((key: string) => Promise<void>) | undefined,
  };
  const previousTransport = process.env.EMAIL_TRANSPORT;
  process.env.EMAIL_TRANSPORT = "resend";
  process.env.RESEND_API_KEY = "re_synthetic_integration_key";
  process.env.EMAIL_FROM = "Home Hub <homehub@example.test>";
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      assert.equal(String(input), "https://api.resend.com/emails");
      const key = new Headers(init?.headers).get("idempotency-key");
      assert.ok(key);
      const body = String(init?.body);
      const existing = provider.accepted.get(key);
      if (existing && existing.body !== body) {
        return Response.json(
          { name: "invalid_idempotent_request", message: "Payload changed for an existing key" },
          { status: 409 },
        );
      }
      const accepted = existing ?? {
        body,
        message: JSON.parse(body) as ProviderMessage,
        id: crypto.randomUUID(),
      };
      provider.accepted.set(key, accepted);
      await provider.onAccepted?.(key);
      return Response.json({ id: accepted.id });
    },
  );
  try {
    await run(provider);
  } finally {
    fetchMock.mock.restore();
    process.env.EMAIL_TRANSPORT = previousTransport;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  }
}

describe("welcome emails with PostgreSQL", { skip: !testDatabaseUrl }, () => {
  before(async () => {
    assert.ok(testDatabaseUrl);
    captureDir = await mkdtemp(join(tmpdir(), "welcome-email-"));
    Object.assign(process.env, {
      DATABASE_URL: testDatabaseUrl,
      NODE_ENV: "test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "welcome-integration-secret-not-for-production",
      EMAIL_JOB_SECRET: "welcome-integration-email-secret-not-for-production",
      EMAIL_TRANSPORT: "capture",
      EMAIL_CAPTURE_DIR: captureDir,
      EMAIL_WORKER_ENABLED: "false",
    });
    await migrate(db, { migrationsFolder: "./drizzle" });
    boss = await getEmailQueue();
    adminId = crypto.randomUUID();
    userIds.push(adminId);
    await db.insert(users).values({
      id: adminId,
      email: `${adminId}@example.test`,
      fullName: "Administrator",
      role: "admin",
      status: "active",
    });
  });

  after(async () => {
    try {
      if (inviteIds.length) {
        await db.execute(sql`
          delete from pgboss.job where ${inArray(sql`data->>'inviteId'`, inviteIds)}
        `);
      }
      if (userIds.length) {
        await db
          .delete(emailDeliveries)
          .where(inArray(emailDeliveries.sourceEntityId, [...userIds, ...inviteIds]));
        await db.delete(verifications).where(inArray(verifications.value, userIds));
        await db.delete(users).where(inArray(users.id, userIds));
      }
    } finally {
      await boss?.stop();
      await db.$client.end();
      if (captureDir) await rm(captureDir, { recursive: true });
    }
  });

  for (const role of ["user", "partner"] as const) {
    it(`sends the ${role} welcome before the invitation and skips it on resend`, async () => {
      assert.ok(boss);
      const email = `${crypto.randomUUID()}@example.test`;
      const first = await invite(email, role);
      assert.equal((await processEmailJob(boss, first.job)).status, "submitted");

      const welcomeFile = join(captureDir, `capture-${first.welcomeAttempt.id}.json`);
      const welcome = JSON.parse(await readFile(welcomeFile, "utf8")) as {
        subject: string;
        text: string;
      };
      assert.match(
        welcome.text,
        role === "partner"
          ? /create listings/
          : /explore listings and connect with housing providers/,
      );
      const [welcomeReceipt] = await db
        .select()
        .from(emailDeliveryAttempts)
        .where(eq(emailDeliveryAttempts.id, first.welcomeAttempt.id));
      const [inviteReceipt] = await db
        .select()
        .from(emailDeliveryAttempts)
        .where(eq(emailDeliveryAttempts.id, first.job.data.attempt.id));
      assert.ok(welcomeReceipt?.submittedAt);
      assert.ok(inviteReceipt?.submittedAt);
      assert.ok(welcomeReceipt.submittedAt <= inviteReceipt.submittedAt);
      const welcomeModifiedAt = (await stat(welcomeFile)).mtimeMs;

      const resend = await invite(email, role);
      assert.equal(resend.welcomeAttempt.id, first.welcomeAttempt.id);
      assert.equal((await processEmailJob(boss, resend.job)).status, "submitted");
      assert.equal((await stat(welcomeFile)).mtimeMs, welcomeModifiedAt);
      assert.ok(await stat(join(captureDir, `capture-${resend.job.data.attempt.id}.json`)));
    });
  }

  it("recovers a job after welcome submission without sending the welcome again", async () => {
    assert.ok(boss);
    const first = await invite(`${crypto.randomUUID()}@example.test`, "partner");
    await sendWelcomeEmail({
      email: first.result.email,
      fullName: "Avery",
      audience: "provider",
      platformUrl: first.result.inviteUrl,
      attempt: first.welcomeAttempt,
    });
    const welcomeFile = join(captureDir, `capture-${first.welcomeAttempt.id}.json`);
    const welcomeModifiedAt = (await stat(welcomeFile)).mtimeMs;

    assert.equal((await processEmailJob(boss, first.job)).status, "submitted");
    assert.equal((await stat(welcomeFile)).mtimeMs, welcomeModifiedAt);
    assert.ok(await stat(join(captureDir, `capture-${first.job.data.attempt.id}.json`)));
  });

  it("retries a permanently failed welcome with a new attempt on invitation resend", async () => {
    assert.ok(boss);
    const email = `${crypto.randomUUID()}@example.test`;
    const first = await invite(email, "user");
    await processDeadLetteredEmailJob(boss, first.job);
    const [failed] = await db
      .select()
      .from(emailDeliveryAttempts)
      .where(eq(emailDeliveryAttempts.id, first.welcomeAttempt.id));
    assert.equal(failed?.outcome, "failed");

    const retry = await invite(email, "user");
    assert.notEqual(retry.welcomeAttempt.id, first.welcomeAttempt.id);
    assert.equal(retry.welcomeAttempt.attemptNumber, 2);
    assert.equal((await processEmailJob(boss, retry.job)).status, "submitted");
  });

  it("recovers a lost welcome receipt after the recipient's name and role change", async () => {
    assert.ok(boss);
    const queue = boss;
    await withIdempotentProvider(async (provider) => {
      const email = `${crypto.randomUUID()}@example.test`;
      const first = await invite(email, "user");
      provider.onAccepted = async () => {
        throw new Error("Provider response lost after acceptance");
      };
      await assert.rejects(processEmailJob(queue, first.job));

      const resend = await invite(email, "partner", "Avery Updated");
      assert.equal(resend.welcomeAttempt.id, first.welcomeAttempt.id);
      provider.onAccepted = undefined;
      assert.equal((await processEmailJob(queue, resend.job)).status, "submitted");
      assert.equal(provider.accepted.size, 2);
      assert.match(
        provider.accepted.get(first.welcomeAttempt.idempotencyKey)?.message.text ?? "",
        /explore listings and connect with housing providers/,
      );
    });
  });

  it("does not fail a welcome owned by a newer invitation while it is being sent", async () => {
    assert.ok(boss);
    const queue = boss;
    await withIdempotentProvider(async (provider) => {
      const email = `${crypto.randomUUID()}@example.test`;
      const first = await invite(email, "user");
      const replacement = await invite(email, "user");
      const started = Promise.withResolvers<void>();
      const resume = Promise.withResolvers<void>();
      provider.onAccepted = async (key) => {
        if (key === replacement.welcomeAttempt.idempotencyKey) {
          started.resolve();
          await resume.promise;
        }
      };
      const sending = processEmailJob(queue, replacement.job);
      await started.promise;
      try {
        await processDeadLetteredEmailJob(queue, first.job);
        const latest = await invite(email, "user");
        assert.equal(latest.welcomeAttempt.id, first.welcomeAttempt.id);
        resume.resolve();
        assert.deepEqual(await sending, { status: "skipped", reason: "invite_expired" });
        assert.equal((await processEmailJob(queue, latest.job)).status, "submitted");
        assert.equal(provider.accepted.size, 2);
      } finally {
        resume.resolve();
        await sending;
      }
    });
  });

  for (const change of ["replaced", "deactivated", "revoked"] as const) {
    it(`skips an invitation ${change} while its welcome is being sent`, async () => {
      assert.ok(boss);
      const queue = boss;
      await withIdempotentProvider(async (provider) => {
        const email = `${crypto.randomUUID()}@example.test`;
        const first = await invite(email, "user");
        provider.onAccepted = async () => {
          if (change === "replaced") {
            await invite(email, "user");
          } else if (change === "deactivated") {
            await db
              .update(users)
              .set({ status: "deactivated" })
              .where(eq(users.id, first.result.userId));
          } else {
            await db
              .update(userInvites)
              .set({ revokedAt: new Date() })
              .where(eq(userInvites.id, first.result.inviteId));
          }
        };
        assert.deepEqual(await processEmailJob(queue, first.job), {
          status: "skipped",
          reason:
            change === "replaced"
              ? "invite_expired"
              : change === "revoked"
                ? "invite_revoked"
                : "account_not_invited",
        });
        assert.equal(provider.accepted.size, 1);
        const [receipt] = await db
          .select()
          .from(emailDeliveryAttempts)
          .where(eq(emailDeliveryAttempts.id, first.job.data.attempt.id));
        assert.equal(receipt?.submittedAt, null);
      });
    });
  }
});
