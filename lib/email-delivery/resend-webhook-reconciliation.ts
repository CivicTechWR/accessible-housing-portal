import "server-only";

import { and, eq, exists, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { emailDeliveryAttempts, resendWebhookEvents } from "@/db/schema";
import {
  formatOutcomeDetail,
  RESEND_EVENT_OUTCOMES,
  shouldApplyProviderOutcome,
} from "@/lib/email-delivery/outcome";

export type ResendWebhookReconciliation = "processed" | "unmatched" | "failed" | "skipped";

const SWEEP_BATCH_SIZE = 500;

// Resend echoes the tags back, so check their shape before comparing them with uuid columns.
const correlationTags = z.object({ attemptId: z.uuid(), deliveryId: z.uuid() });

/**
 * Applies one stored event to its delivery attempt and records how the event was
 * classified. Returns `skipped` when the event is already processed or another caller is
 * processing it.
 *
 * Never throws. An error rolls the event's transaction back, marks the row `failed` and is
 * left for the sweep, so a caller can acknowledge the webhook whatever happens here.
 */
export async function reconcileResendWebhookEvent(
  svixId: string,
): Promise<ResendWebhookReconciliation> {
  try {
    return await db.transaction(async (tx) => {
      // This lock is what stops the webhook request and the sweep applying an event twice.
      const [event] = await tx
        .select()
        .from(resendWebhookEvents)
        .where(
          and(
            eq(resendWebhookEvents.svixId, svixId),
            ne(resendWebhookEvents.processingStatus, "processed"),
          ),
        )
        .for("update", { skipLocked: true });

      if (!event) return "skipped";

      const classify = (
        processingStatus: "processed" | "unmatched",
        deliveryAttemptId: string | null,
      ) =>
        tx
          .update(resendWebhookEvents)
          .set({ processingStatus, deliveryAttemptId, processedAt: sql`now()` })
          .where(eq(resendWebhookEvents.svixId, svixId));

      const byProviderEmailId = eq(emailDeliveryAttempts.providerEmailId, event.providerEmailId);
      const tags = correlationTags.safeParse({
        attemptId: event.attemptIdTag,
        deliveryId: event.deliveryIdTag,
      });

      // The tags identify the attempt when a webhook arrives before the worker has saved
      // the provider email id. They are trusted only while the attempt has no id of its own.
      const [attempt] = await tx
        .select({ id: emailDeliveryAttempts.id, outcome: emailDeliveryAttempts.outcome })
        .from(emailDeliveryAttempts)
        .where(
          tags.success
            ? or(
                byProviderEmailId,
                and(
                  eq(emailDeliveryAttempts.id, tags.data.attemptId),
                  eq(emailDeliveryAttempts.deliveryId, tags.data.deliveryId),
                  isNull(emailDeliveryAttempts.providerEmailId),
                ),
              )
            : byProviderEmailId,
        )
        // Nulls sort last, so an attempt that holds the email id beats one named by tags.
        .orderBy(emailDeliveryAttempts.providerEmailId)
        .limit(1)
        .for("update");

      if (!attempt) {
        await classify("unmatched", null);
        // Only the signed svix id and the validated event type. Nothing else from the payload.
        console.warn(
          `[resend-webhook] No delivery attempt matches stored event ${svixId} (${event.eventType}); marked unmatched.`,
        );
        return "unmatched";
      }

      const reported = RESEND_EVENT_OUTCOMES[event.eventType];

      if (shouldApplyProviderOutcome(attempt.outcome, reported)) {
        await tx
          .update(emailDeliveryAttempts)
          .set({
            outcome: reported,
            outcomeAt: event.eventCreatedAt,
            outcomeDetail: formatOutcomeDetail(event),
          })
          .where(eq(emailDeliveryAttempts.id, attempt.id));
      }

      await classify("processed", attempt.id);
      return "processed";
    });
  } catch (error) {
    console.error(`[resend-webhook] Failed to reconcile stored event ${svixId}:`, error);

    // Best effort. If this write fails too, the row keeps its status and the sweep still
    // picks it up.
    await db
      .update(resendWebhookEvents)
      .set({ processingStatus: "failed", processedAt: sql`now()` })
      .where(
        and(
          eq(resendWebhookEvents.svixId, svixId),
          ne(resendWebhookEvents.processingStatus, "processed"),
        ),
      )
      .catch(() => undefined);

    return "failed";
  }
}

/**
 * Reconciles stored events that are not settled: `pending` and `failed` rows, and
 * `unmatched` rows whose provider email id has since been saved on an attempt. The email
 * worker runs this on a schedule, so no event depends on another webhook delivery.
 */
export async function reconcileStoredResendWebhookEvents() {
  const events = await db
    .select({ svixId: resendWebhookEvents.svixId })
    .from(resendWebhookEvents)
    .where(
      or(
        inArray(resendWebhookEvents.processingStatus, ["pending", "failed"]),
        // Tag matching can't succeed later if it didn't the first time, because the attempt
        // row exists before its email is sent. Only a newly saved email id changes the result.
        and(
          eq(resendWebhookEvents.processingStatus, "unmatched"),
          exists(
            db
              .select({ id: emailDeliveryAttempts.id })
              .from(emailDeliveryAttempts)
              .where(
                eq(emailDeliveryAttempts.providerEmailId, resendWebhookEvents.providerEmailId),
              ),
          ),
        ),
      ),
    )
    .orderBy(resendWebhookEvents.webhookReceivedAt)
    .limit(SWEEP_BATCH_SIZE);

  const counts = { processed: 0, unmatched: 0, failed: 0, skipped: 0 };

  for (const { svixId } of events) {
    counts[await reconcileResendWebhookEvent(svixId)] += 1;
  }

  return counts;
}
