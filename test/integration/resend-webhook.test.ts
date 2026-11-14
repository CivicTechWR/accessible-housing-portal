import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { POST } from "@/app/api/webhooks/resend/route";
import { db } from "@/db";
import { resendWebhookEvents } from "@/db/schema";
import { pruneExpiredResendWebhookEvents } from "@/lib/email-delivery/resend-webhook-store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const runId = crypto.randomUUID();
const svixIds: string[] = [];
const secretBytes = randomBytes(32);

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

describe("Resend webhook ledger with PostgreSQL", { skip: !testDatabaseUrl }, () => {
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
    };
    await db.insert(resendWebhookEvents).values([
      { ...base, svixId: expired, webhookReceivedAt: new Date(now.getTime() - 91 * day) },
      { ...base, svixId: recent, webhookReceivedAt: new Date(now.getTime() - 89 * day) },
    ]);

    await pruneExpiredResendWebhookEvents(now);

    assert.deepEqual(await rowsFor([expired, recent]), [{ svixId: recent }]);
  });
});
