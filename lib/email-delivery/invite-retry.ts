import "server-only";

import { and, eq, gt, inArray, lt, notExists, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  emailDeliveries,
  emailDeliveryAttempts,
  resendWebhookEvents,
  userInvites,
  users,
} from "@/db/schema";
import type { EmailDeliveryAttemptRef } from "@/lib/email-delivery/attempt";
import {
  decideInviteRetry,
  getProviderRetryBlocker,
  INVITE_EMAIL_MAX_ATTEMPTS,
  type InviteRetryDecision,
  type ProviderRetryBlocker,
} from "@/lib/email-delivery/invite-retry-policy";
import {
  startNumberedEmailDeliveryAttempt,
  type EmailDeliveryTransaction,
} from "@/lib/email-delivery/store";
import { enqueueEmail } from "@/lib/email-queue/queue";

type Executor = typeof db | EmailDeliveryTransaction;

export type InviteRetryResult =
  | "scheduled"
  | "already_scheduled"
  | Extract<InviteRetryDecision, { retry: false }>["reason"];

/**
 * Every provider event stored for any attempt of a delivery. An event that reconciliation
 * has not linked yet is found by the provider email id it shares with its attempt.
 */
function findDeliveryProviderEvents(executor: Executor, deliveryId: string) {
  const ofDelivery = eq(emailDeliveryAttempts.deliveryId, deliveryId);

  return executor
    .select({
      eventType: resendWebhookEvents.eventType,
      bounceType: resendWebhookEvents.bounceType,
      bounceSubtype: resendWebhookEvents.bounceSubtype,
    })
    .from(resendWebhookEvents)
    .where(
      or(
        inArray(
          resendWebhookEvents.deliveryAttemptId,
          executor
            .select({ id: emailDeliveryAttempts.id })
            .from(emailDeliveryAttempts)
            .where(ofDelivery),
        ),
        inArray(
          resendWebhookEvents.providerEmailId,
          executor
            .select({ providerEmailId: emailDeliveryAttempts.providerEmailId })
            .from(emailDeliveryAttempts)
            .where(ofDelivery),
        ),
      ),
    );
}

async function loadInviteRetryState(executor: Executor, attemptId: string) {
  const [row] = await executor
    .select({
      attempt: {
        attemptNumber: emailDeliveryAttempts.attemptNumber,
        outcome: emailDeliveryAttempts.outcome,
        outcomeDetail: emailDeliveryAttempts.outcomeDetail,
      },
      delivery: { id: emailDeliveries.id, emailType: emailDeliveries.emailType },
      invite: {
        id: userInvites.id,
        userId: userInvites.userId,
        acceptedAt: userInvites.acceptedAt,
        revokedAt: userInvites.revokedAt,
        expiresAt: userInvites.expiresAt,
        sealedUrl: userInvites.sealedUrl,
      },
      userStatus: users.status,
    })
    .from(emailDeliveryAttempts)
    .innerJoin(emailDeliveries, eq(emailDeliveries.id, emailDeliveryAttempts.deliveryId))
    .innerJoin(userInvites, eq(userInvites.id, emailDeliveries.sourceEntityId))
    .innerJoin(users, eq(users.id, userInvites.userId))
    .where(
      and(eq(emailDeliveryAttempts.id, attemptId), eq(emailDeliveries.emailType, "account_invite")),
    );

  return row && { ...row, events: await findDeliveryProviderEvents(executor, row.delivery.id) };
}

/**
 * Schedules one delayed retry of the invitation email after `attemptId` bounced, when
 * `decideInviteRetry` allows it. The retry is the next numbered attempt on the same
 * delivery and sends the invitation's current link.
 *
 * Safe to call any number of times and from several callers at once. The successor's
 * attempt number is the bounced attempt's plus one, so a second caller collides with the
 * unique `(delivery_id, attempt_number)` index and schedules nothing.
 */
export async function scheduleInviteEmailRetry(
  attemptId: string,
  now = new Date(),
): Promise<InviteRetryResult> {
  // Decided without a lock first, so an attempt that will never be retried does not lock
  // its user on every sweep.
  const glance = await loadInviteRetryState(db, attemptId);
  if (!glance) return "invite_unavailable";
  const early = decideInviteRetry(glance, now);
  if (!early.retry) return early.reason;

  const scheduled = await db.transaction(async (tx) => {
    // Replacing, revoking and accepting an invitation all hold this user row lock, so the
    // invitation cannot change between the decision below and the commit. It is taken
    // before any attempt row is written, the same order the dead-letter path uses.
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, glance.invite.userId))
      .for("update");

    const state = await loadInviteRetryState(tx, attemptId);
    if (!state) return "invite_unavailable";
    const decision = decideInviteRetry(state, now);
    if (!decision.retry) return decision.reason;

    const attempt = await startNumberedEmailDeliveryAttempt(tx, {
      deliveryId: state.delivery.id,
      emailType: state.delivery.emailType,
      sourceEntityId: state.invite.id,
      attemptNumber: decision.attemptNumber,
    });
    if (!attempt) return "already_scheduled";

    // No welcome attempt: the welcome email belongs to the first send only.
    await enqueueEmail(
      tx,
      { type: "account_invite", inviteId: state.invite.id, attempt, secret: decision.sealedUrl },
      { startAfter: decision.sendAt },
    );

    return {
      inviteId: state.invite.id,
      attemptNumber: attempt.attemptNumber,
      sendAt: decision.sendAt,
    };
  });

  if (typeof scheduled === "string") return scheduled;

  console.info(
    `[email-queue] Invite ${scheduled.inviteId} bounced recoverably; attempt ${scheduled.attemptNumber} is scheduled for ${scheduled.sendAt.toISOString()}.`,
  );

  return "scheduled";
}

/**
 * Schedules a retry for every bounced invitation attempt that is due one. The email worker
 * runs this after each reconciliation sweep. It reads stored attempt state rather than
 * webhook deliveries, so a retry missed by a crash is picked up by the next run.
 */
export async function scheduleInviteEmailRetries(now = new Date()) {
  const successor = alias(emailDeliveryAttempts, "successor");

  // A cheap superset of the attempts to retry. `scheduleInviteEmailRetry` makes the real
  // decision. Only bounced attempts of unexpired invitations qualify, so the set stays small.
  const candidates = await db
    .select({ id: emailDeliveryAttempts.id })
    .from(emailDeliveryAttempts)
    .innerJoin(emailDeliveries, eq(emailDeliveries.id, emailDeliveryAttempts.deliveryId))
    .innerJoin(userInvites, eq(userInvites.id, emailDeliveries.sourceEntityId))
    .where(
      and(
        eq(emailDeliveries.emailType, "account_invite"),
        eq(emailDeliveryAttempts.outcome, "bounced"),
        lt(emailDeliveryAttempts.attemptNumber, INVITE_EMAIL_MAX_ATTEMPTS),
        gt(userInvites.expiresAt, now),
        notExists(
          db
            .select({ id: successor.id })
            .from(successor)
            .where(
              and(
                eq(successor.deliveryId, emailDeliveryAttempts.deliveryId),
                gt(successor.attemptNumber, emailDeliveryAttempts.attemptNumber),
              ),
            ),
        ),
      ),
    );

  const counts = { scheduled: 0, failed: 0 };

  for (const { id } of candidates) {
    try {
      if ((await scheduleInviteEmailRetry(id, now)) === "scheduled") counts.scheduled += 1;
    } catch (error) {
      counts.failed += 1;
      console.error(`[email-queue] Failed to schedule a retry after invite attempt ${id}:`, error);
    }
  }

  return counts;
}

/**
 * Checked by the worker right before it sends an automatic retry, because the provider can
 * report more about the earlier attempts during the backoff: a `delivered` event, a
 * complaint, or a bounce that is not recoverable.
 */
export async function findInviteRetrySendBlocker(
  retry: EmailDeliveryAttemptRef,
): Promise<ProviderRetryBlocker | null> {
  const [previous] = await db
    .select({
      outcome: emailDeliveryAttempts.outcome,
      outcomeDetail: emailDeliveryAttempts.outcomeDetail,
    })
    .from(emailDeliveryAttempts)
    .where(
      and(
        eq(emailDeliveryAttempts.deliveryId, retry.deliveryId),
        eq(emailDeliveryAttempts.attemptNumber, retry.attemptNumber - 1),
      ),
    );

  if (!previous) return "bounce_not_recoverable";

  return getProviderRetryBlocker(previous, await findDeliveryProviderEvents(db, retry.deliveryId));
}
