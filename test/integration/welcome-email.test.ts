import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { eq, inArray, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Job, PgBoss } from "pg-boss";

import { db } from "@/db";
import { emailDeliveries, emailDeliveryAttempts, users, verifications } from "@/db/schema";
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

async function invite(email: string, role: "user" | "partner") {
  const result = await createInvite({
    email,
    fullName: "Avery",
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
});
