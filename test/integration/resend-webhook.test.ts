import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";
import { eq, inArray, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { POST } from "@/app/api/webhooks/resend/route";
import { db } from "@/db";
import {
  emailDeliveries,
  emailDeliveryAttempts,
  resendWebhookEvents,
  type EmailDeliveryType,
} from "@/db/schema";
import type { ResendOperationalEventType } from "@/lib/email-delivery/outcome";
import {
  reconcileResendWebhookEvent,
  reconcileStoredResendWebhookEvents,
} from "@/lib/email-delivery/resend-webhook-reconciliation";
import { pruneExpiredResendWebhookEvents } from "@/lib/email-delivery/resend-webhook-store";
import { recordEmailDeliveryAttemptSubmission } from "@/lib/email-delivery/store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const runId = crypto.randomUUID();
const svixIds: string[] = [];
const deliveryIds: string[] = [];
const secretBytes = randomBytes(32);
const EVENT_CREATED_AT = "2026-09-23T14:30:00.000Z";

function svixId(name: string) {
  const id = `msg_${runId}_${name}`;
  svixIds.push(id);
  return id;
}

function signedRequest(id: string, event: object) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const signature = createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    body: payload,
    headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` },
  });
}

function rowsFor(ids: string[]) {
  return db
    .select({ svixId: resendWebhookEvents.svixId })
    .from(resendWebhookEvents)
    .where(inArray(resendWebhookEvents.svixId, ids));
}

/** Opens a delivery with one attempt, submitted to the provider unless `submitted` is false. */
async function startAttempt(emailType: EmailDeliveryType, { submitted = true } = {}) {
  const [delivery] = await db
    .insert(emailDeliveries)
    .values({ emailType, sourceEntityId: crypto.randomUUID() })
    .returning();
  assert.ok(delivery);
  deliveryIds.push(delivery.id);

  const providerEmailId = `email_${crypto.randomUUID()}`;
  const [attempt] = await db
    .insert(emailDeliveryAttempts)
    .values({
      deliveryId: delivery.id,
      attemptNumber: 1,
      idempotencyKey: `${runId}/${delivery.id}`,
      ...(submitted && { providerEmailId, submittedAt: new Date(), outcome: "sent" as const }),
    })
    .returning();
  assert.ok(attempt);

  return { id: attempt.id, deliveryId: delivery.id, providerEmailId };
}

/** Delivers a signed webhook the way Resend does, with payload fields the ledger must drop. */
async function receive(
  type: ResendOperationalEventType,
  data: { email_id: string } & Record<string, unknown>,
  createdAt = EVENT_CREATED_AT,
) {
  const id = svixId(crypto.randomUUID());
  const response = await POST(
    signedRequest(id, {
      type,
      created_at: createdAt,
      data: { to: ["resident@example.net"], subject: "Your invitation", ...data },
    }),
  );
  assert.equal(response.status, 200);
  return id;
}

async function attemptState(attemptId: string) {
  const [attempt] = await db
    .select({
      outcome: emailDeliveryAttempts.outcome,
      outcomeAt: emailDeliveryAttempts.outcomeAt,
      outcomeDetail: emailDeliveryAttempts.outcomeDetail,
    })
    .from(emailDeliveryAttempts)
    .where(eq(emailDeliveryAttempts.id, attemptId));
  assert.ok(attempt);
  return attempt;
}

async function eventState(id: string) {
  const [event] = await db
    .select({
      processingStatus: resendWebhookEvents.processingStatus,
      deliveryAttemptId: resendWebhookEvents.deliveryAttemptId,
    })
    .from(resendWebhookEvents)
    .where(eq(resendWebhookEvents.svixId, id));
  assert.ok(event);
  return event;
}

describe("Resend webhooks with PostgreSQL", { skip: !testDatabaseUrl }, () => {
  const warn = mock.method(console, "warn", () => {});

  before(async () => {
    assert.ok(testDatabaseUrl);
    Object.assign(process.env, {
      DATABASE_URL: testDatabaseUrl,
      NODE_ENV: "test",
      RESEND_WEBHOOK_SECRET: `whsec_${secretBytes.toString("base64")}`,
    });
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  after(async () => {
    try {
      await db.delete(resendWebhookEvents).where(inArray(resendWebhookEvents.svixId, svixIds));
      await db.delete(emailDeliveries).where(inArray(emailDeliveries.id, deliveryIds));
    } finally {
      await db.$client.end();
    }
  });

  it("stores a redelivered event once and acknowledges both deliveries", async () => {
    const id = svixId("delivered");
    const event = {
      type: "email.delivered",
      created_at: "2026-09-23T14:30:00.000Z",
      data: { email_id: `email_${runId}`, to: ["resident@example.net"], subject: "Hi" },
    };

    const first = await POST(signedRequest(id, event));
    const second = await POST(signedRequest(id, event));

    assert.deepEqual(await first.json(), { received: true, status: "recorded" });
    assert.deepEqual(await second.json(), { received: true, status: "duplicate" });
    assert.equal((await rowsFor([id])).length, 1);
  });

  it("deletes receipts older than 90 days and keeps recent ones", async () => {
    const now = new Date("2026-12-31T12:00:00.000Z");
    const day = 24 * 60 * 60 * 1_000;
    const expired = svixId("expired");
    const recent = svixId("recent");
    const base = {
      eventType: "email.delivered",
      providerEmailId: `email_${runId}`,
      eventCreatedAt: now,
    } as const;
    await db.insert(resendWebhookEvents).values([
      { ...base, svixId: expired, webhookReceivedAt: new Date(now.getTime() - 91 * day) },
      { ...base, svixId: recent, webhookReceivedAt: new Date(now.getTime() - 89 * day) },
    ]);

    await pruneExpiredResendWebhookEvents(now);

    assert.deepEqual(await rowsFor([expired, recent]), [{ svixId: recent }]);
  });

  it("stores the provider's classification for each email type", async () => {
    const cases = [
      {
        emailType: "account_invite",
        type: "email.bounced",
        data: {
          bounce: { type: "Permanent", subType: "General", message: "550 no such resident" },
        },
        outcome: "bounced",
        detail: { bounceType: "Permanent", bounceSubtype: "General" },
      },
      {
        emailType: "account_welcome",
        type: "email.bounced",
        data: { bounce: { type: "Transient", subType: "MailboxFull" } },
        outcome: "bounced",
        detail: { bounceType: "Transient", bounceSubtype: "MailboxFull" },
      },
      {
        emailType: "password_reset",
        type: "email.bounced",
        data: { bounce: { type: "Undetermined", subType: "Undetermined" } },
        outcome: "bounced",
        detail: { bounceType: "Undetermined", bounceSubtype: "Undetermined" },
      },
      {
        emailType: "password_reset",
        type: "email.failed",
        data: { failed: { reason: "reached_daily_quota" } },
        outcome: "failed",
        detail: { failureReason: "reached_daily_quota" },
      },
      {
        emailType: "account_welcome",
        type: "email.suppressed",
        data: { suppressed: { type: "OnAccountSuppressionList", message: "Address suppressed" } },
        outcome: "suppressed",
        detail: { suppressionType: "OnAccountSuppressionList" },
      },
    ] as const;

    for (const { emailType, type, data, outcome, detail } of cases) {
      const attempt = await startAttempt(emailType);
      const event = await receive(type, { email_id: attempt.providerEmailId, ...data });
      const state = await attemptState(attempt.id);

      assert.equal(state.outcome, outcome);
      assert.deepEqual(state.outcomeAt, new Date(EVENT_CREATED_AT));
      assert.deepEqual(JSON.parse(state.outcomeDetail ?? "null"), detail);
      assert.deepEqual(await eventState(event), {
        processingStatus: "processed",
        deliveryAttemptId: attempt.id,
      });
    }
  });

  it("keeps a bounce when delivered and delayed events arrive after it", async () => {
    const attempt = await startAttempt("account_invite");
    const data = { email_id: attempt.providerEmailId };
    await receive("email.bounced", { ...data, bounce: { type: "Permanent", subType: "General" } });
    const bounced = await attemptState(attempt.id);

    const late = [
      await receive("email.delivered", data, "2026-09-23T14:29:00.000Z"),
      await receive("email.delivery_delayed", data, "2026-09-23T14:31:00.000Z"),
    ];

    assert.equal(bounced.outcome, "bounced");
    assert.deepEqual(await attemptState(attempt.id), bounced);
    for (const event of late) {
      assert.deepEqual(await eventState(event), {
        processingStatus: "processed",
        deliveryAttemptId: attempt.id,
      });
    }
  });

  it("replaces a delay with delivery and a delivery with a later complaint", async () => {
    const attempt = await startAttempt("account_welcome");
    const data = { email_id: attempt.providerEmailId };

    await receive("email.delivery_delayed", data, "2026-09-23T14:30:00.000Z");
    assert.equal((await attemptState(attempt.id)).outcome, "delivery_delayed");

    await receive("email.delivered", data, "2026-09-23T14:40:00.000Z");
    assert.deepEqual(await attemptState(attempt.id), {
      outcome: "delivered",
      outcomeAt: new Date("2026-09-23T14:40:00.000Z"),
      outcomeDetail: null,
    });

    await receive("email.complained", data, "2026-09-24T09:00:00.000Z");
    await receive("email.delivered", data, "2026-09-24T09:05:00.000Z");
    assert.deepEqual(await attemptState(attempt.id), {
      outcome: "complained",
      outcomeAt: new Date("2026-09-24T09:00:00.000Z"),
      outcomeDetail: null,
    });
  });

  it("matches by correlation tags when the webhook beats the submission write", async () => {
    const attempt = await startAttempt("password_reset", { submitted: false });
    const tags = {
      email_type: "password_reset",
      delivery_id: attempt.deliveryId,
      attempt_id: attempt.id,
    };

    const event = await receive("email.delivered", { email_id: attempt.providerEmailId, tags });
    await recordEmailDeliveryAttemptSubmission({
      attemptId: attempt.id,
      providerEmailId: attempt.providerEmailId,
    });

    assert.deepEqual(await eventState(event), {
      processingStatus: "processed",
      deliveryAttemptId: attempt.id,
    });
    assert.equal((await attemptState(attempt.id)).outcome, "delivered");
  });

  it("leaves an event unmatched when its tags are malformed, name the wrong delivery, or name an attempt that holds another email id", async () => {
    const attempt = await startAttempt("account_invite", { submitted: false });
    const other = await startAttempt("account_invite", { submitted: false });
    const submitted = await startAttempt("account_invite");
    const data = { email_id: `email_${crypto.randomUUID()}` };

    const events = [
      await receive("email.bounced", {
        ...data,
        tags: { delivery_id: attempt.deliveryId, attempt_id: "not-a-uuid" },
      }),
      await receive("email.bounced", {
        ...data,
        tags: { delivery_id: other.deliveryId, attempt_id: attempt.id },
      }),
      await receive("email.bounced", {
        ...data,
        tags: { delivery_id: submitted.deliveryId, attempt_id: submitted.id },
      }),
    ];

    for (const event of events) {
      assert.deepEqual(await eventState(event), {
        processingStatus: "unmatched",
        deliveryAttemptId: null,
      });
    }
    assert.equal((await attemptState(attempt.id)).outcome, "queued");
    assert.equal((await attemptState(submitted.id)).outcome, "sent");
  });

  it("reconciles an unmatched event once the attempt has its provider email id", async () => {
    const attempt = await startAttempt("account_invite", { submitted: false });

    const event = await receive("email.bounced", {
      email_id: attempt.providerEmailId,
      bounce: { type: "Transient", subType: "General" },
    });
    await reconcileStoredResendWebhookEvents();

    assert.equal((await eventState(event)).processingStatus, "unmatched");
    assert.deepEqual(
      warn.mock.calls.map((call) => call.arguments).filter(([line]) => line.includes(event)),
      [
        [
          `[resend-webhook] No delivery attempt matches stored event ${event} (email.bounced); marked unmatched.`,
        ],
      ],
    );

    await recordEmailDeliveryAttemptSubmission({
      attemptId: attempt.id,
      providerEmailId: attempt.providerEmailId,
    });
    await reconcileStoredResendWebhookEvents();

    assert.deepEqual(await eventState(event), {
      processingStatus: "processed",
      deliveryAttemptId: attempt.id,
    });
    assert.equal((await attemptState(attempt.id)).outcome, "bounced");
  });

  it("acknowledges a stored event whose reconciliation fails and retries it in the sweep", async (t) => {
    t.mock.method(console, "error", () => {});
    const attempt = await startAttempt("account_invite");
    const id = svixId("reconciliation-failure");
    const event = {
      type: "email.delivered",
      created_at: EVENT_CREATED_AT,
      data: { email_id: attempt.providerEmailId },
    };

    await db.execute(
      sql.raw(`
        create or replace function ahp_test_reject_attempt_update() returns trigger language plpgsql
          as $$ begin raise exception 'rejected by test'; end $$;
        drop trigger if exists ahp_test_reject_attempt_update on email_delivery_attempts;
        create trigger ahp_test_reject_attempt_update before update on email_delivery_attempts
          for each row when (old.id = '${attempt.id}')
          execute function ahp_test_reject_attempt_update();
      `),
    );

    try {
      const response = await POST(signedRequest(id, event));

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { received: true, status: "recorded" });
      assert.equal((await eventState(id)).processingStatus, "failed");
      assert.equal((await attemptState(attempt.id)).outcome, "sent");
    } finally {
      await db.execute(
        sql.raw(`
          drop trigger ahp_test_reject_attempt_update on email_delivery_attempts;
          drop function ahp_test_reject_attempt_update();
        `),
      );
    }

    await reconcileStoredResendWebhookEvents();

    assert.deepEqual(await eventState(id), {
      processingStatus: "processed",
      deliveryAttemptId: attempt.id,
    });
    assert.equal((await attemptState(attempt.id)).outcome, "delivered");
  });

  it("applies a stored event once when several callers reconcile it at the same time", async () => {
    const attempt = await startAttempt("account_invite");
    const id = svixId("concurrent");
    await db.insert(resendWebhookEvents).values({
      svixId: id,
      eventType: "email.delivered",
      providerEmailId: attempt.providerEmailId,
      eventCreatedAt: new Date(EVENT_CREATED_AT),
    });

    const results = await Promise.all(
      Array.from({ length: 4 }, () => reconcileResendWebhookEvent(id)),
    );

    assert.deepEqual(results.toSorted(), ["processed", "skipped", "skipped", "skipped"]);
    assert.equal((await attemptState(attempt.id)).outcome, "delivered");
  });

  it("keeps the higher-ranked outcome when two events for one attempt are reconciled at the same time", async () => {
    // Without the attempt row lock both transactions read `sent` and the later write wins,
    // which is `delivered` about half the time. Several attempts make that hard to miss.
    const attempts = await Promise.all(
      Array.from({ length: 6 }, () => startAttempt("account_invite")),
    );
    const events = attempts.flatMap((attempt) =>
      (["email.bounced", "email.delivered"] as const).map((eventType) => ({
        svixId: svixId(crypto.randomUUID()),
        eventType,
        providerEmailId: attempt.providerEmailId,
        eventCreatedAt: new Date(EVENT_CREATED_AT),
      })),
    );
    await db.insert(resendWebhookEvents).values(events);

    await Promise.all(events.map((event) => reconcileResendWebhookEvent(event.svixId)));

    for (const attempt of attempts) {
      assert.equal((await attemptState(attempt.id)).outcome, "bounced");
    }
  });
});
