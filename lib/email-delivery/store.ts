import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailDeliveries, emailDeliveryAttempts, type EmailDeliveryType } from "@/db/schema";
import {
  getEmailDeliveryAttemptIdempotencyKey,
  type EmailDeliveryAttemptRef,
} from "@/lib/email-delivery/attempt";
import type { EmailOutcomeDetail } from "@/lib/email-delivery/outcome";

export type EmailDeliveryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Hold the user row lock so invitation resends share the current welcome attempt.
export async function getOrStartWelcomeEmailAttempt(
  tx: EmailDeliveryTransaction,
  userId: string,
): Promise<EmailDeliveryAttemptRef> {
  const [latest] = await tx
    .select({
      id: emailDeliveryAttempts.id,
      deliveryId: emailDeliveries.id,
      emailType: emailDeliveries.emailType,
      attemptNumber: emailDeliveryAttempts.attemptNumber,
      idempotencyKey: emailDeliveryAttempts.idempotencyKey,
      outcome: emailDeliveryAttempts.outcome,
      submittedAt: emailDeliveryAttempts.submittedAt,
    })
    .from(emailDeliveries)
    .innerJoin(emailDeliveryAttempts, eq(emailDeliveryAttempts.deliveryId, emailDeliveries.id))
    .where(
      and(
        eq(emailDeliveries.emailType, "account_welcome"),
        eq(emailDeliveries.sourceEntityId, userId),
      ),
    )
    .orderBy(desc(emailDeliveryAttempts.attemptNumber))
    .limit(1);

  if (latest && (latest.submittedAt || latest.outcome !== "failed")) {
    const { outcome: _outcome, submittedAt: _submittedAt, ...attempt } = latest;
    return attempt;
  }

  return startEmailDeliveryAttempt(tx, { emailType: "account_welcome", sourceEntityId: userId });
}

export async function startEmailDeliveryAttempt(
  tx: EmailDeliveryTransaction,
  params: { emailType: EmailDeliveryType; sourceEntityId: string },
): Promise<EmailDeliveryAttemptRef> {
  const [delivery] = await tx
    .insert(emailDeliveries)
    .values({ emailType: params.emailType, sourceEntityId: params.sourceEntityId })
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

/**
 * Opens the attempt numbered `attemptNumber` on an existing delivery. Returns null when the
 * delivery already has that attempt. The unique `(delivery_id, attempt_number)` index decides
 * that, so callers racing to follow the same attempt end up with one successor.
 */
export async function startNumberedEmailDeliveryAttempt(
  tx: EmailDeliveryTransaction,
  params: {
    deliveryId: string;
    emailType: EmailDeliveryType;
    sourceEntityId: string;
    attemptNumber: number;
  },
): Promise<EmailDeliveryAttemptRef | null> {
  const { deliveryId, emailType, attemptNumber } = params;
  const idempotencyKey = getEmailDeliveryAttemptIdempotencyKey(params);

  const [attempt] = await tx
    .insert(emailDeliveryAttempts)
    .values({ deliveryId, attemptNumber, idempotencyKey })
    .onConflictDoNothing()
    .returning({ id: emailDeliveryAttempts.id });

  return attempt ? { id: attempt.id, deliveryId, emailType, attemptNumber, idempotencyKey } : null;
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
      providerEmailId: sql`coalesce(${emailDeliveryAttempts.providerEmailId}, ${params.providerEmailId})`,
      submittedAt: sql`coalesce(${emailDeliveryAttempts.submittedAt}, now())`,
      outcome: sql`case when ${emailDeliveryAttempts.outcome} = 'queued' then 'sent'::"email_delivery_outcome" else ${emailDeliveryAttempts.outcome} end`,
    })
    .where(eq(emailDeliveryAttempts.id, params.attemptId));
}

/**
 * Records how the queue ended an attempt it never submitted: `failed` when its job was
 * dead-lettered, `suppressed` with the reason when the worker chose not to send it. An
 * attempt the provider accepted keeps the outcome the provider reports.
 */
export async function recordUnsentEmailDeliveryAttempt(
  attemptId: string,
  result: { outcome: "failed" } | { outcome: "suppressed"; skipReason: string },
) {
  const detail: EmailOutcomeDetail | null =
    result.outcome === "suppressed" ? { skipReason: result.skipReason } : null;

  await db
    .update(emailDeliveryAttempts)
    .set({ outcome: result.outcome, outcomeDetail: detail && JSON.stringify(detail) })
    .where(
      and(
        eq(emailDeliveryAttempts.id, attemptId),
        isNull(emailDeliveryAttempts.submittedAt),
        // A webhook can report on an attempt before its submission is saved.
        eq(emailDeliveryAttempts.outcome, "queued"),
      ),
    );
}
