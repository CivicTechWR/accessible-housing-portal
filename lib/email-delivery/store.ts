import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailDeliveries, emailDeliveryAttempts, type EmailDeliveryType } from "@/db/schema";
import {
  getEmailDeliveryAttemptIdempotencyKey,
  type EmailDeliveryAttemptRef,
} from "@/lib/email-delivery/attempt";

export type EmailDeliveryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Call inside the source record's transaction.
 *
 * The upsert serializes attempt numbers, but does not dedupe resend requests.
 */
export async function startEmailDeliveryAttempt(
  tx: EmailDeliveryTransaction,
  params: { emailType: EmailDeliveryType; sourceEntityId: string },
): Promise<EmailDeliveryAttemptRef> {
  const [delivery] = await tx
    .insert(emailDeliveries)
    .values({ emailType: params.emailType, sourceEntityId: params.sourceEntityId })
    // Use a no-op update so RETURNING also works for an existing delivery.
    .onConflictDoUpdate({
      target: [emailDeliveries.emailType, emailDeliveries.sourceEntityId],
      set: { sourceEntityId: params.sourceEntityId },
    })
    .returning({ id: emailDeliveries.id });

  if (!delivery) {
    throw new Error(`Failed to open an email delivery for ${params.emailType}.`);
  }

  const [latestAttempt] = await tx
    .select({ attemptNumber: emailDeliveryAttempts.attemptNumber })
    .from(emailDeliveryAttempts)
    .where(eq(emailDeliveryAttempts.deliveryId, delivery.id))
    .orderBy(desc(emailDeliveryAttempts.attemptNumber))
    .limit(1);

  const attemptNumber = (latestAttempt?.attemptNumber ?? 0) + 1;
  const idempotencyKey = getEmailDeliveryAttemptIdempotencyKey({
    emailType: params.emailType,
    sourceEntityId: params.sourceEntityId,
    attemptNumber,
  });

  const [attempt] = await tx
    .insert(emailDeliveryAttempts)
    .values({ deliveryId: delivery.id, attemptNumber, idempotencyKey })
    .returning({ id: emailDeliveryAttempts.id });

  if (!attempt) {
    throw new Error(`Failed to open an email delivery attempt for ${params.emailType}.`);
  }

  return {
    id: attempt.id,
    deliveryId: delivery.id,
    emailType: params.emailType,
    attemptNumber,
    idempotencyKey,
  };
}

export async function recordEmailDeliveryAttemptQueueJob(
  tx: EmailDeliveryTransaction,
  params: { attemptId: string; queueJobId: string },
) {
  await tx
    .update(emailDeliveryAttempts)
    .set({ queueJobId: params.queueJobId })
    .where(eq(emailDeliveryAttempts.id, params.attemptId));
}

export async function recordEmailDeliveryAttemptSubmission(params: {
  attemptId: string;
  providerEmailId: string | null;
}) {
  await db
    .update(emailDeliveryAttempts)
    .set({
      // A retry may get here after a successful send, so keep the first submission.
      providerEmailId: sql`coalesce(${emailDeliveryAttempts.providerEmailId}, ${params.providerEmailId})`,
      submittedAt: sql`coalesce(${emailDeliveryAttempts.submittedAt}, now())`,
      // Keep any provider outcome that arrived before this write.
      outcome: sql`case when ${emailDeliveryAttempts.outcome} = 'queued' then 'sent'::"email_delivery_outcome" else ${emailDeliveryAttempts.outcome} end`,
    })
    .where(eq(emailDeliveryAttempts.id, params.attemptId));
}
