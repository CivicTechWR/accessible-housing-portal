import "server-only";

import { db } from "@/db";
import { resendWebhookEvents } from "@/db/schema";

export type ResendWebhookEventRecord = typeof resendWebhookEvents.$inferInsert;

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
