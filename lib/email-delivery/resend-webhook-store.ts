import "server-only";

import { lt } from "drizzle-orm";

import { db } from "@/db";
import { resendWebhookEvents } from "@/db/schema";

export type ResendWebhookEventRecord = typeof resendWebhookEvents.$inferInsert;
export const RESEND_WEBHOOK_RETENTION_DAYS = 90;

export async function recordResendWebhookEvent(
  event: ResendWebhookEventRecord,
): Promise<"recorded" | "duplicate"> {
  const inserted = await db
    .insert(resendWebhookEvents)
    .values(event)
    .onConflictDoNothing({ target: resendWebhookEvents.svixId })
    .returning({ svixId: resendWebhookEvents.svixId });

  return inserted.length === 0 ? "duplicate" : "recorded";
}

export async function pruneExpiredResendWebhookEvents(now = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - RESEND_WEBHOOK_RETENTION_DAYS);

  const deleted = await db
    .delete(resendWebhookEvents)
    .where(lt(resendWebhookEvents.webhookReceivedAt, cutoff))
    .returning({ svixId: resendWebhookEvents.svixId });

  return deleted.length;
}
