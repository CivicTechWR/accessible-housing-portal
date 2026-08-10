import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailDeliveries, emailDeliveryAttempts, type EmailDeliveryType } from "@/db/schema";
import {
  getEmailDeliveryAttemptIdempotencyKey,
  type EmailDeliveryAttemptRef,
} from "@/lib/email-delivery/attempt";

/** The `db` handle or a transaction from `db.transaction`. */
export type EmailDeliveryDatabase = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Open the next attempt of a logical delivery, creating the delivery on first
 * use. Callers should run this in the transaction that writes the record the
 * email is about, so a committed record always has an attempt to send.
 *
 * The delivery upsert takes a row lock, so concurrent callers are serialized
 * and each reads the other's committed attempts: numbering stays contiguous
 * and the unique index is never hit. That protects numbering only — it is not
 * a resend guard. Two concurrent resend requests legitimately produce two
 * attempts and two emails, so a caller that must not resend twice (an admin
 * resend action) has to deduplicate the request itself.
 */
export async function startEmailDeliveryAttempt(
  tx: EmailDeliveryDatabase,
  params: { emailType: EmailDeliveryType; sourceEntityId: string },
): Promise<EmailDeliveryAttemptRef> {
  const [delivery] = await tx
    .insert(emailDeliveries)
    .values({ emailType: params.emailType, sourceEntityId: params.sourceEntityId })
    // A no-op update rather than `doNothing`, so an existing delivery is
    // returned instead of no row at all.
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

/** Record which queue job owns an attempt, for tracing a send back to its job row. */
export async function recordEmailDeliveryAttemptQueueJob(
  tx: EmailDeliveryDatabase,
  params: { attemptId: string; queueJobId: string },
) {
  await tx
    .update(emailDeliveryAttempts)
    .set({ queueJobId: params.queueJobId })
    .where(eq(emailDeliveryAttempts.id, params.attemptId));
}

/**
 * Record that the provider accepted this attempt. The provider email id is the
 * correlation key for every later delivery outcome, so it is stored even when
 * the caller goes on to fail — a submission that landed must stay traceable.
 *
 * An attempt can reach here more than once: a job whose send succeeded but
 * that then expired (or failed to mark its source record) retries, and the
 * provider replays the original submission under the same idempotency key.
 * Every field is therefore written first-wins, so a replay describes the same
 * submission it did the first time instead of moving it forward.
 */
export async function recordEmailDeliveryAttemptSubmission(params: {
  attemptId: string;
  providerEmailId: string | null;
}) {
  await db
    .update(emailDeliveryAttempts)
    .set({
      providerEmailId: sql`coalesce(${emailDeliveryAttempts.providerEmailId}, ${params.providerEmailId})`,
      submittedAt: sql`coalesce(${emailDeliveryAttempts.submittedAt}, now())`,
      // An outcome can only be learned after submission, but a late-arriving
      // one must not be walked back to "sent" by a slow submission write.
      outcome: sql`case when ${emailDeliveryAttempts.outcome} = 'queued' then 'sent'::"email_delivery_outcome" else ${emailDeliveryAttempts.outcome} end`,
    })
    .where(eq(emailDeliveryAttempts.id, params.attemptId));
}
