import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailDeliveries, emailDeliveryAttempts, type EmailDeliveryType } from "@/db/schema";
import {
  getEmailDeliveryAttemptIdempotencyKey,
  type EmailDeliveryAttemptRef,
} from "@/lib/email-delivery/attempt";

export type EmailDeliveryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function startEmailDeliveryAttempt(
  tx: EmailDeliveryTransaction,
  params: { emailType: EmailDeliveryType; sourceEntityId: string },
): Promise<EmailDeliveryAttemptRef> {
  const deliveryId = await upsertEmailDelivery(tx, params);

  const [latestAttempt] = await tx
    .select({ attemptNumber: emailDeliveryAttempts.attemptNumber })
    .from(emailDeliveryAttempts)
    .where(eq(emailDeliveryAttempts.deliveryId, deliveryId))
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
    .values({ deliveryId, attemptNumber, idempotencyKey })
    .returning({ id: emailDeliveryAttempts.id });

  if (!attempt) {
    throw new Error(`Failed to open an email delivery attempt for ${params.emailType}.`);
  }

  return {
    id: attempt.id,
    deliveryId,
    emailType: params.emailType,
    attemptNumber,
    idempotencyKey,
  };
}

/** Adopt a legacy queued send under its original provider idempotency key. */
export async function adoptEmailDeliveryAttempt(params: {
  emailType: EmailDeliveryType;
  sourceEntityId: string;
  idempotencyKey: string;
}): Promise<EmailDeliveryAttemptRef> {
  return await db.transaction(async (tx) => {
    const deliveryId = await upsertEmailDelivery(tx, params);

    const [attempt] = await tx
      .insert(emailDeliveryAttempts)
      .values({ deliveryId, attemptNumber: 1, idempotencyKey: params.idempotencyKey })
      .onConflictDoUpdate({
        target: emailDeliveryAttempts.idempotencyKey,
        set: { idempotencyKey: params.idempotencyKey },
      })
      .returning({
        id: emailDeliveryAttempts.id,
        attemptNumber: emailDeliveryAttempts.attemptNumber,
      });

    if (!attempt) {
      throw new Error(`Failed to adopt an email delivery attempt for ${params.emailType}.`);
    }

    return {
      id: attempt.id,
      deliveryId,
      emailType: params.emailType,
      attemptNumber: attempt.attemptNumber,
      idempotencyKey: params.idempotencyKey,
      adopted: true,
    };
  });
}

async function upsertEmailDelivery(
  tx: EmailDeliveryTransaction,
  params: { emailType: EmailDeliveryType; sourceEntityId: string },
) {
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

  return delivery.id;
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
