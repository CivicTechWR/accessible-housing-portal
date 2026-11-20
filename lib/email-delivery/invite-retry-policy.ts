import type { EmailDeliveryOutcome, UserStatus } from "@/db/schema";
import { parseOutcomeDetail, type ResendOperationalEventType } from "@/lib/email-delivery/outcome";

/**
 * The only bounces an invitation email is sent again after: `bounceType` `Transient` with
 * one of these subtypes. Resend documents five transient subtypes at
 * https://resend.com/docs/dashboard/emails/email-bounces.
 *
 * - `General` and `MailboxFull` can clear without anyone changing the message, so they are
 *   retried.
 * - `MessageTooLarge`, `ContentRejected` and `AttachmentRejected` reject the message itself.
 *   The same message would be rejected again, so they are not retried.
 *
 * `Permanent` and `Undetermined` bounces, and any type or subtype not named here, are never
 * retried.
 */
const RECOVERABLE_BOUNCE_TYPE = "Transient";
const RECOVERABLE_BOUNCE_SUBTYPES: ReadonlySet<string> = new Set(["General", "MailboxFull"]);

/**
 * Hours to wait before each automatic retry: the first entry follows a bounce of attempt 1,
 * the second a bounce of attempt 2. The wait starts when the retry is scheduled, which is the
 * first worker sweep after the bounce is stored. Long enough for a mailbox to be emptied or a mail server
 * to recover, and short enough that the last retry falls well inside an invitation's seven
 * days.
 */
export const INVITE_RETRY_BACKOFF_HOURS: readonly number[] = [4, 24];

/** Attempts allowed for one invitation email, counting the original send. */
export const INVITE_EMAIL_MAX_ATTEMPTS = INVITE_RETRY_BACKOFF_HOURS.length + 1;

const HOUR_IN_MS = 60 * 60 * 1_000;

type BounceClassification = {
  bounceType?: string | null;
  bounceSubtype?: string | null;
};

/** What one stored provider event said, as kept in `resend_webhook_events`. */
export type ProviderEventReport = BounceClassification & {
  eventType: ResendOperationalEventType;
};

type BouncedAttempt = {
  outcome: EmailDeliveryOutcome;
  outcomeDetail: string | null;
};

export type InviteRetryState = {
  /** The attempt a retry would follow. Its number comes from the stored row. */
  attempt: BouncedAttempt & { attemptNumber: number };
  /** Every provider event stored for any attempt of the delivery, in any order. */
  events: readonly ProviderEventReport[];
  invite: {
    acceptedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
    /** Cleared when the invitation is accepted, revoked or replaced. */
    sealedUrl: string | null;
  };
  userStatus: UserStatus;
};

export type ProviderRetryBlocker = "already_delivered" | "bounce_not_recoverable";

export type InviteRetryDecision =
  | { retry: true; attemptNumber: number; sendAt: Date; sealedUrl: string }
  | {
      retry: false;
      reason:
        | ProviderRetryBlocker
        | "attempt_cap_reached"
        | "invite_unavailable"
        | "invite_expires_first";
    };

function isRecoverableBounce(bounce: BounceClassification): boolean {
  return (
    bounce.bounceType === RECOVERABLE_BOUNCE_TYPE &&
    typeof bounce.bounceSubtype === "string" &&
    RECOVERABLE_BOUNCE_SUBTYPES.has(bounce.bounceSubtype)
  );
}

/**
 * Why the provider's reports rule out sending the message again after `attempt`, or null
 * when they don't.
 *
 * The attempt row alone is not enough. It keeps only its highest-ranked outcome, and of two
 * bounces it keeps the first one's detail. A mail server can also report an auto-reply to a
 * delivered message as a transient bounce. So every stored event has to agree: anything
 * other than a recoverable bounce or a delay blocks the retry.
 */
export function getProviderRetryBlocker(
  attempt: BouncedAttempt,
  events: readonly ProviderEventReport[],
): ProviderRetryBlocker | null {
  if (events.some((event) => event.eventType === "email.delivered")) return "already_delivered";

  const recoverable =
    attempt.outcome === "bounced" &&
    isRecoverableBounce(parseOutcomeDetail(attempt.outcomeDetail)) &&
    events.every(
      (event) =>
        event.eventType === "email.delivery_delayed" ||
        (event.eventType === "email.bounced" && isRecoverableBounce(event)),
    );

  return recoverable ? null : "bounce_not_recoverable";
}

/** Decides whether a bounced invitation attempt gets one more attempt, and when. */
export function decideInviteRetry(state: InviteRetryState, now: Date): InviteRetryDecision {
  const blocker = getProviderRetryBlocker(state.attempt, state.events);
  if (blocker) return { retry: false, reason: blocker };

  const backoffHours = INVITE_RETRY_BACKOFF_HOURS[state.attempt.attemptNumber - 1];
  if (backoffHours === undefined) return { retry: false, reason: "attempt_cap_reached" };

  const { invite } = state;
  if (
    state.userStatus !== "invited" ||
    invite.acceptedAt ||
    invite.revokedAt ||
    !invite.sealedUrl ||
    invite.expiresAt <= now
  ) {
    return { retry: false, reason: "invite_unavailable" };
  }

  const sendAt = new Date(now.getTime() + backoffHours * HOUR_IN_MS);
  if (sendAt >= invite.expiresAt) return { retry: false, reason: "invite_expires_first" };

  return {
    retry: true,
    attemptNumber: state.attempt.attemptNumber + 1,
    sendAt,
    sealedUrl: invite.sealedUrl,
  };
}
