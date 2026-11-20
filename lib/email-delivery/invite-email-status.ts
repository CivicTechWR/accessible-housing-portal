import type { EmailDeliveryOutcome } from "@/db/schema";
import {
  decideInviteRetry,
  getProviderRetryBlocker,
  type InviteRetryState,
  type ProviderEventReport,
} from "@/lib/email-delivery/invite-retry-policy";
import { parseOutcomeDetail } from "@/lib/email-delivery/outcome";
import type { InviteEmailStatus } from "@/shared/schemas/account-management";

/** Resend's `bounceType` for an address that does not accept mail. */
const PERMANENT_BOUNCE_TYPE = "Permanent";

export type InviteEmailAttempt = {
  attemptNumber: number;
  outcome: EmailDeliveryOutcome;
  /** The provider's event time. Null when the queue worker wrote the outcome. */
  outcomeAt: Date | null;
  outcomeDetail: string | null;
};

export type InviteEmailHistory = Pick<InviteRetryState, "invite" | "userStatus"> & {
  /** Every attempt of the invitation's email delivery, in any order. */
  attempts: readonly InviteEmailAttempt[];
  /** Every provider event reconciled to those attempts, in any order. */
  events: readonly ProviderEventReport[];
};

/**
 * What happened to an invitation's email, for administrators. Null when the invitation can
 * no longer be used (accepted, revoked, replaced or expired, or its account is no longer
 * invited): the invitation's own status says what matters then, and a bounce needs no action.
 *
 * The latest attempt is not the whole story, so the delivery is read as a whole:
 *
 * - An attempt keeps only its highest-ranked outcome and `bounced` outranks `delivered`, so
 *   a `delivered` event can sit behind a bounce. A permanent bounce still means the address
 *   does not accept mail. Any other bounce next to a `delivered` event is usually an
 *   automatic reply, and the email counts as delivered. The retry rules treat it the same way
 *   and send nothing more.
 * - A retry the worker chose not to send is `suppressed` without the provider having said
 *   anything, so it is left out and the attempts before it decide.
 * - Whether a bounce gets another automatic attempt is `decideInviteRetry`'s call.
 */
export function getInviteEmailStatus(
  history: InviteEmailHistory,
  now: Date,
): InviteEmailStatus | null {
  const { invite, userStatus, events } = history;

  if (
    userStatus !== "invited" ||
    invite.acceptedAt ||
    invite.revokedAt ||
    invite.expiresAt <= now
  ) {
    return null;
  }

  // The first attempt is created together with the email job, so an invitation without
  // attempts was created as a link to share by hand.
  if (history.attempts.length === 0) return { state: "not_requested" };

  const attempts = [...history.attempts].sort((a, b) => a.attemptNumber - b.attemptNumber);

  if (attempts.some((attempt) => attempt.outcome === "complained")) return { state: "complained" };

  const bounces = [
    ...attempts
      .filter((attempt) => attempt.outcome === "bounced")
      .map((attempt) => parseOutcomeDetail(attempt.outcomeDetail)),
    ...events.filter((event) => event.eventType === "email.bounced"),
  ];
  if (bounces.some((bounce) => bounce.bounceType === PERMANENT_BOUNCE_TYPE)) {
    return { state: "failed", reason: "permanent_bounce" };
  }

  const sendable = attempts.filter(
    (attempt) => !(attempt.outcome === "suppressed" && attempt.outcomeAt === null),
  );
  const current = sendable.at(-1);
  // Every attempt was skipped by the worker, so nothing was sent.
  if (!current) return { state: "failed", reason: "send_failed" };

  const delivered =
    events.some((event) => event.eventType === "email.delivered") ||
    attempts.some((attempt) => attempt.outcome === "delivered");
  if (delivered) return { state: "delivered", bounceReported: current.outcome !== "delivered" };

  switch (current.outcome) {
    case "queued": {
      // Only an automatic retry has an attempt before it, and that attempt bounced.
      const bounced = sendable.at(-2);
      if (!bounced) return { state: "queued" };

      // The worker asks the same question right before it sends the retry.
      return getProviderRetryBlocker(bounced, events)
        ? { state: "failed", reason: "bounced" }
        : { state: "retrying", attemptNumber: current.attemptNumber };
    }
    case "sent":
      return { state: "submitted", attemptNumber: current.attemptNumber };
    case "delivery_delayed":
      return { state: "delayed" };
    case "delivered":
      return { state: "delivered", bounceReported: false };
    case "bounced": {
      // A retry that the worker skipped is the last one: a bounced attempt gets one successor.
      if (current !== attempts.at(-1)) return { state: "failed", reason: "bounced" };

      const decision = decideInviteRetry({ attempt: current, events, invite, userStatus }, now);
      if (decision.retry) return { state: "retrying", attemptNumber: decision.attemptNumber };

      return {
        state: "failed",
        reason: decision.reason === "attempt_cap_reached" ? "retries_used_up" : "bounced",
      };
    }
    case "failed":
      // Without an event time the outcome came from the worker: the send job was dead-lettered.
      return { state: "failed", reason: current.outcomeAt ? "provider_failed" : "send_failed" };
    case "suppressed":
      return { state: "failed", reason: "address_suppressed" };
    case "complained":
      return { state: "complained" };
  }
}
