import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it, mock } from "node:test";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Job, PgBoss } from "pg-boss";

import { db } from "@/db";
import {
  emailDeliveries,
  emailDeliveryAttempts,
  resendWebhookEvents,
  userInvites,
  users,
  verifications,
} from "@/db/schema";
import { createInvite } from "@/lib/auth/invite-service";
import { findAccountInvites } from "@/lib/auth/invite-store";
import type { EmailDeliveryAttemptRef } from "@/lib/email-delivery/attempt";
import {
  scheduleInviteEmailRetries,
  scheduleInviteEmailRetry,
} from "@/lib/email-delivery/invite-retry";
import type { ResendOperationalEventType } from "@/lib/email-delivery/outcome";
import { reconcileResendWebhookEvent } from "@/lib/email-delivery/resend-webhook-reconciliation";
import {
  openEmailJobSecret,
  type AccountInviteEmailJobData,
  type EmailJobData,
} from "@/lib/email-queue/email-job";
import { getEmailQueue } from "@/lib/email-queue/queue";
import { processDeadLetteredEmailJob, processEmailJob } from "@/lib/email-queue/worker";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const HOUR = 60 * 60 * 1_000;
const TRANSIENT = { bounceType: "Transient", bounceSubtype: "MailboxFull" };
const userIds: string[] = [];
const inviteIds: string[] = [];
const svixIds: string[] = [];
const deliveryIds: string[] = [];
let captureDir: string;
let adminId: string;
let boss: PgBoss | undefined;

function queue() {
  assert.ok(boss);
  return boss;
}

async function jobById(id: string | null) {
  assert.ok(id);
  const [row] = await db.execute<{
    id: string;
    name: string;
    data: AccountInviteEmailJobData;
    start_after: string;
  }>(sql`select id, name, data, start_after from pgboss.job where id = ${id}`);
  assert.ok(row);
  const { start_after, ...job } = row;
  return {
    job: { ...job, signal: new AbortController().signal } as Job<AccountInviteEmailJobData>,
    startAfter: new Date(start_after),
  };
}

function attemptsOf(deliveryId: string) {
  return db
    .select()
    .from(emailDeliveryAttempts)
    .where(eq(emailDeliveryAttempts.deliveryId, deliveryId))
    .orderBy(asc(emailDeliveryAttempts.attemptNumber));
}

function capturePath(attemptId: string) {
  return join(captureDir, `capture-${attemptId}.json`);
}

/** Stores a provider event about a submitted attempt without reconciling it. */
async function store(
  attemptId: string,
  eventType: ResendOperationalEventType,
  codes: Partial<typeof TRANSIENT> = {},
) {
  const svixId = `msg_${crypto.randomUUID()}`;
  svixIds.push(svixId);
  await db.insert(resendWebhookEvents).values({
    svixId,
    eventType,
    // The capture transport's provider email id.
    providerEmailId: `capture-${attemptId}`,
    eventCreatedAt: new Date(),
    ...codes,
  });
  return svixId;
}

/** Stores a provider event and reconciles it, as the webhook route does. */
async function report(...event: Parameters<typeof store>) {
  assert.equal(await reconcileResendWebhookEvent(await store(...event)), "processed");
}

/** Invites a housing searcher and submits the welcome and invitation emails. */
async function sendInvite() {
  const result = await createInvite({
    email: `${crypto.randomUUID()}@example.test`,
    fullName: "Avery",
    role: "user",
    organization: null,
    invitedByUserId: adminId,
    sendInviteEmail: true,
  });
  userIds.push(result.userId);
  inviteIds.push(result.inviteId);

  const [attempt] = await db
    .select({
      id: emailDeliveryAttempts.id,
      deliveryId: emailDeliveryAttempts.deliveryId,
      queueJobId: emailDeliveryAttempts.queueJobId,
    })
    .from(emailDeliveryAttempts)
    .innerJoin(emailDeliveries, eq(emailDeliveries.id, emailDeliveryAttempts.deliveryId))
    .where(eq(emailDeliveries.sourceEntityId, result.inviteId));
  assert.ok(attempt);

  const { job } = await jobById(attempt.queueJobId);
  assert.ok(job.data.welcomeAttempt);
  assert.equal((await processEmailJob(queue(), job)).status, "submitted");

  return { ...result, attempt, welcomeAttempt: job.data.welcomeAttempt };
}

type SentInvite = Awaited<ReturnType<typeof sendInvite>>;

/** What an administrator's replacement does to the earlier invitation, without the email. */
async function replaceInvite(invite: SentInvite) {
  await createInvite({
    email: invite.email,
    fullName: "Avery",
    role: "user",
    organization: null,
    invitedByUserId: adminId,
    sendInviteEmail: false,
  });
}

async function sendBouncedInvite(codes = TRANSIENT) {
  const invite = await sendInvite();
  await report(invite.attempt.id, "email.bounced", codes);
  return invite;
}

/** Runs the sweep the email worker schedules. It covers every invitation in the database. */
async function sweep(now?: Date) {
  assert.equal((await scheduleInviteEmailRetries(now)).failed, 0);
}

/** The delayed job of the delivery's latest attempt. */
async function latestRetry(deliveryId: string) {
  const retry = (await attemptsOf(deliveryId)).at(-1);
  assert.ok(retry);
  return { retry, ...(await jobById(retry.queueJobId)) };
}

describe("automatic invite email retries with PostgreSQL", { skip: !testDatabaseUrl }, () => {
  mock.method(console, "info", () => {});

  before(async () => {
    assert.ok(testDatabaseUrl);
    captureDir = await mkdtemp(join(tmpdir(), "invite-retry-"));
    Object.assign(process.env, {
      DATABASE_URL: testDatabaseUrl,
      NODE_ENV: "test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "invite-retry-integration-secret-not-for-production",
      EMAIL_JOB_SECRET: "invite-retry-integration-email-secret-not-for-production",
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
      // Invitations created by a test's own replacement share a user with a tracked one.
      const invites = await db
        .select({ id: userInvites.id })
        .from(userInvites)
        .where(inArray(userInvites.userId, userIds));
      const sourceIds = [...userIds, ...invites.map((invite) => invite.id)];
      await db.execute(sql`
        delete from pgboss.job where ${inArray(sql`data->>'inviteId'`, sourceIds)}
      `);
      await db.delete(resendWebhookEvents).where(inArray(resendWebhookEvents.svixId, svixIds));
      await db.delete(emailDeliveries).where(inArray(emailDeliveries.sourceEntityId, sourceIds));
      await db.delete(emailDeliveries).where(inArray(emailDeliveries.id, deliveryIds));
      await db.delete(verifications).where(inArray(verifications.value, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    } finally {
      await boss?.stop();
      await db.$client.end();
      if (captureDir) await rm(captureDir, { recursive: true });
    }
  });

  it("schedules one delayed retry of the same link after a recoverable bounce, however often it is asked", async () => {
    const invite = await sendBouncedInvite();
    const now = new Date();

    await sweep(now);
    // A repeated sweep and a second event about the same attempt change nothing.
    await sweep(now);
    await report(invite.attempt.id, "email.bounced", {
      bounceType: "Transient",
      bounceSubtype: "General",
    });
    await sweep(now);

    const [first, retry, ...rest] = await attemptsOf(invite.attempt.deliveryId);
    assert.ok(first && retry);
    assert.equal(rest.length, 0);
    assert.equal(retry.attemptNumber, 2);
    assert.equal(retry.idempotencyKey, `account_invite/${invite.inviteId}/attempt/2`);
    assert.equal(retry.outcome, "queued");
    assert.notEqual(retry.queueJobId, first.queueJobId);

    const { job, startAfter } = await jobById(retry.queueJobId);
    assert.deepEqual(startAfter, new Date(now.getTime() + 4 * HOUR));
    assert.equal(job.data.attempt.id, retry.id);
    assert.equal(job.data.welcomeAttempt, undefined);
    assert.equal(openEmailJobSecret(job.data.secret), invite.inviteUrl);
  });

  it("sends the retry although the invitation was submitted before, once, without another welcome", async () => {
    const invite = await sendBouncedInvite();
    await sweep();
    const { retry, job } = await latestRetry(invite.attempt.deliveryId);
    const welcomeSentAt = (await stat(capturePath(invite.welcomeAttempt.id))).mtimeMs;
    const [before] = await db.select().from(userInvites).where(eq(userInvites.id, invite.inviteId));
    assert.ok(before?.sentAt);

    assert.equal((await processEmailJob(queue(), job)).status, "submitted");

    const sent = JSON.parse(await readFile(capturePath(retry.id), "utf8")) as { text: string };
    assert.ok(sent.text.includes(invite.inviteUrl));
    assert.equal((await stat(capturePath(invite.welcomeAttempt.id))).mtimeMs, welcomeSentAt);
    const [, submitted] = await attemptsOf(invite.attempt.deliveryId);
    assert.equal(submitted?.outcome, "sent");
    assert.ok(submitted.submittedAt);
    const [afterRetry] = await db
      .select()
      .from(userInvites)
      .where(eq(userInvites.id, invite.inviteId));
    assert.deepEqual(afterRetry?.sentAt, before.sentAt);

    // An ordinary queue retry of the same job must not send the attempt again.
    const retrySentAt = (await stat(capturePath(retry.id))).mtimeMs;
    assert.deepEqual(await processEmailJob(queue(), job), {
      status: "skipped",
      reason: "invite_already_submitted",
    });
    assert.equal((await stat(capturePath(retry.id))).mtimeMs, retrySentAt);
    assert.equal((await attemptsOf(invite.attempt.deliveryId))[1]?.outcome, "sent");
  });

  it("schedules nothing for outcomes that are not a recoverable bounce, or for a welcome email", async () => {
    const cases: [ResendOperationalEventType, Partial<typeof TRANSIENT>][] = [
      ["email.bounced", { bounceType: "Permanent", bounceSubtype: "General" }],
      ["email.delivery_delayed", {}],
      ["email.suppressed", {}],
      ["email.complained", {}],
      ["email.failed", {}],
    ];
    const invites = [];
    for (const [eventType, codes] of cases) {
      const invite = await sendInvite();
      await report(invite.attempt.id, eventType, codes);
      invites.push(invite);
    }
    const welcomed = await sendInvite();
    await report(welcomed.welcomeAttempt.id, "email.bounced", TRANSIENT);

    await sweep();

    for (const invite of invites) {
      assert.equal((await attemptsOf(invite.attempt.deliveryId)).length, 1);
    }
    assert.equal((await attemptsOf(welcomed.welcomeAttempt.deliveryId)).length, 1);
    assert.equal((await attemptsOf(welcomed.attempt.deliveryId)).length, 1);
  });

  it("waits 24 hours for the second retry and stops after the third attempt", async () => {
    const invite = await sendBouncedInvite();
    const now = new Date();
    await sweep(now);
    const second = await latestRetry(invite.attempt.deliveryId);
    await processEmailJob(queue(), second.job);
    await report(second.retry.id, "email.bounced", TRANSIENT);

    await sweep(now);
    const third = await latestRetry(invite.attempt.deliveryId);
    assert.equal(third.retry.attemptNumber, 3);
    assert.deepEqual(third.startAfter, new Date(now.getTime() + 24 * HOUR));
    await processEmailJob(queue(), third.job);
    await report(third.retry.id, "email.bounced", TRANSIENT);

    await sweep(now);
    assert.equal((await attemptsOf(invite.attempt.deliveryId)).length, 3);
  });

  it("schedules nothing when the bounced attempt was also reported delivered, in either order", async () => {
    const deliveredFirst = await sendInvite();
    await report(deliveredFirst.attempt.id, "email.delivered");
    await report(deliveredFirst.attempt.id, "email.bounced", TRANSIENT);
    const bouncedFirst = await sendBouncedInvite();
    await report(bouncedFirst.attempt.id, "email.delivered");

    await sweep();

    for (const invite of [deliveredFirst, bouncedFirst]) {
      const attempts = await attemptsOf(invite.attempt.deliveryId);
      assert.deepEqual(
        attempts.map((attempt) => attempt.outcome),
        ["bounced"],
      );
    }
  });

  it("does not send a scheduled retry once the provider reports delivery, a complaint or a permanent bounce", async () => {
    const cases: [ResendOperationalEventType, Partial<typeof TRANSIENT>, string][] = [
      ["email.delivered", {}, "already_delivered"],
      ["email.complained", {}, "bounce_not_recoverable"],
      // Ranks the same as the transient bounce, so the attempt row still says Transient.
      [
        "email.bounced",
        { bounceType: "Permanent", bounceSubtype: "General" },
        "bounce_not_recoverable",
      ],
    ];

    for (const [eventType, codes, reason] of cases) {
      const invite = await sendBouncedInvite();
      await sweep();
      const { retry, job } = await latestRetry(invite.attempt.deliveryId);

      await report(invite.attempt.id, eventType, codes);

      assert.deepEqual(await processEmailJob(queue(), job), { status: "skipped", reason });
      await assert.rejects(access(capturePath(retry.id)));
      const [, skipped] = await attemptsOf(invite.attempt.deliveryId);
      assert.equal(skipped?.outcome, "suppressed");
      assert.deepEqual(JSON.parse(skipped.outcomeDetail ?? "null"), { skipReason: reason });

      // The skipped attempt ends the chain: nothing schedules another one.
      await sweep();
      assert.equal((await attemptsOf(invite.attempt.deliveryId)).length, 2);
    }
  });

  it("schedules nothing for a replaced or soon-expiring invitation", async () => {
    const changes = {
      replaced: replaceInvite,
      // The first retry waits four hours, which is after this invitation ends.
      "soon-expiring": async (invite: SentInvite) => {
        await db
          .update(userInvites)
          .set({ expiresAt: new Date(Date.now() + HOUR) })
          .where(eq(userInvites.id, invite.inviteId));
      },
    };

    for (const [name, change] of Object.entries(changes)) {
      const invite = await sendBouncedInvite();
      await change(invite);

      await sweep();
      assert.equal((await attemptsOf(invite.attempt.deliveryId)).length, 1, name);
    }
  });

  it("does not send a scheduled retry when a delivered event is stored but not yet reconciled", async () => {
    const invite = await sendBouncedInvite();
    await sweep();
    const { retry, job } = await latestRetry(invite.attempt.deliveryId);

    await store(invite.attempt.id, "email.delivered");

    assert.deepEqual(await processEmailJob(queue(), job), {
      status: "skipped",
      reason: "already_delivered",
    });
    await assert.rejects(access(capturePath(retry.id)));
  });

  it("does not send a scheduled retry after the invitation is replaced", async () => {
    const invite = await sendBouncedInvite();
    await sweep();
    const { retry, job } = await latestRetry(invite.attempt.deliveryId);

    await replaceInvite(invite);

    assert.deepEqual(await processEmailJob(queue(), job), {
      status: "skipped",
      reason: "invite_expired",
    });
    await assert.rejects(access(capturePath(retry.id)));
    const [, skipped] = await attemptsOf(invite.attempt.deliveryId);
    assert.equal(skipped?.outcome, "suppressed");
    assert.deepEqual(JSON.parse(skipped.outcomeDetail ?? "null"), { skipReason: "invite_expired" });
  });

  it("creates one successor when several callers schedule the same retry at once", async () => {
    const invite = await sendBouncedInvite();

    const results = await Promise.all([
      ...Array.from({ length: 6 }, () => scheduleInviteEmailRetry(invite.attempt.id)),
      scheduleInviteEmailRetries(),
      scheduleInviteEmailRetries(),
    ]);

    const single = results.filter((result) => typeof result === "string");
    assert.ok(single.every((result) => result === "scheduled" || result === "already_scheduled"));
    assert.ok(single.filter((result) => result === "scheduled").length <= 1);
    assert.equal((await attemptsOf(invite.attempt.deliveryId)).length, 2);
    const jobs = await db.execute(
      sql`select id from pgboss.job where data->>'inviteId' = ${invite.inviteId}`,
    );
    assert.equal(jobs.length, 2);
  });

  it("decides under the user row lock that invitation changes hold", async () => {
    const invite = await sendBouncedInvite();
    let scheduling: ReturnType<typeof scheduleInviteEmailRetry> | undefined;

    await db.transaction(async (tx) => {
      await tx.select().from(users).where(eq(users.id, invite.userId)).for("update");
      scheduling = scheduleInviteEmailRetry(invite.attempt.id);
      // Long enough for a scheduler that ignored the lock to commit a retry.
      await new Promise((resolve) => setTimeout(resolve, 250));
      await tx
        .update(userInvites)
        .set({ expiresAt: new Date(), revokedAt: new Date(), sealedUrl: null })
        .where(eq(userInvites.id, invite.inviteId));
    });

    assert.equal(await scheduling, "invite_unavailable");
    assert.equal((await attemptsOf(invite.attempt.deliveryId)).length, 1);
  });

  it("marks a dead-lettered retry failed and does not retry it again", async (t) => {
    t.mock.method(console, "error", () => {});
    const invite = await sendBouncedInvite();
    await sweep();
    const { job } = await latestRetry(invite.attempt.deliveryId);

    await processDeadLetteredEmailJob(queue(), job);

    await sweep();
    const attempts = await attemptsOf(invite.attempt.deliveryId);
    assert.deepEqual(
      attempts.map((attempt) => attempt.outcome),
      ["bounced", "failed"],
    );
  });

  it("lists each invitation with the status of its own email, read across attempts and events", async () => {
    const emailStatusOf = async (invite: SentInvite) =>
      (await findAccountInvites()).find((row) => row.id === invite.inviteId)?.emailStatus;

    const retried = await sendBouncedInvite();
    await sweep();
    // An automatic reply: the attempt reads `bounced` and only the events show the delivery.
    const autoReplied = await sendInvite();
    await report(autoReplied.attempt.id, "email.delivered");
    await report(autoReplied.attempt.id, "email.bounced");
    // The welcome email is a delivery of its own and says nothing about the invitation email.
    const welcomeBounced = await sendInvite();
    await report(welcomeBounced.welcomeAttempt.id, "email.bounced", {
      bounceType: "Permanent",
      bounceSubtype: "General",
    });

    assert.deepEqual(await emailStatusOf(retried), { state: "retrying", attemptNumber: 2 });
    assert.deepEqual(await emailStatusOf(autoReplied), {
      state: "delivered",
      bounceReported: true,
    });
    assert.deepEqual(await emailStatusOf(welcomeBounced), {
      state: "submitted",
      attemptNumber: 1,
    });

    const { job } = await latestRetry(retried.attempt.deliveryId);
    assert.equal((await processEmailJob(queue(), job)).status, "submitted");
    assert.deepEqual(await emailStatusOf(retried), { state: "submitted", attemptNumber: 2 });

    await replaceInvite(retried);
    assert.equal(await emailStatusOf(retried), null);
  });

  it("keeps the provider's outcome when a submitted password reset is dead-lettered", async () => {
    const userId = crypto.randomUUID();
    const [delivery] = await db
      .insert(emailDeliveries)
      .values({ emailType: "password_reset", sourceEntityId: userId })
      .returning();
    assert.ok(delivery);
    deliveryIds.push(delivery.id);
    const attempt: EmailDeliveryAttemptRef = {
      id: crypto.randomUUID(),
      deliveryId: delivery.id,
      emailType: "password_reset",
      attemptNumber: 1,
      idempotencyKey: `password_reset/${userId}/attempt/1`,
    };
    await db.insert(emailDeliveryAttempts).values({
      ...attempt,
      submittedAt: new Date(),
      outcome: "delivered",
    });
    const job = {
      id: crypto.randomUUID(),
      data: {
        type: "password_reset",
        resetId: crypto.randomUUID(),
        userId,
        expiresAt: new Date().toISOString(),
        attempt,
        secret: "redacted",
      },
      signal: new AbortController().signal,
    } as Job<EmailJobData>;

    await processDeadLetteredEmailJob(queue(), job);

    assert.equal((await attemptsOf(delivery.id))[0]?.outcome, "delivered");
  });
});
