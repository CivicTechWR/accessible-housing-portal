import { z } from "zod";

import type { EmailDeliveryOutcome } from "@/db/schema";

/** The Resend events kept in the webhook ledger, and the attempt outcome each one reports. */
export const RESEND_EVENT_OUTCOMES = {
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
  "email.complained": "complained",
} as const satisfies Record<string, EmailDeliveryOutcome>;

export type ResendOperationalEventType = keyof typeof RESEND_EVENT_OUTCOMES;
export type ProviderOutcome = (typeof RESEND_EVENT_OUTCOMES)[ResendOperationalEventType];

/**
 * Ordering rules for attempt outcomes. A provider event is applied only when its outcome
 * ranks above the attempt's current one, so an attempt holds the highest-ranked outcome
 * reported so far. The result is the same whatever order events arrive in and however
 * often they are replayed.
 *
 * - `queued` and `sent` are what the application knows before the provider reports
 *   anything, so every provider outcome replaces them.
 * - `delivery_delayed` is not terminal because Resend is still trying. Every terminal
 *   outcome replaces it and it replaces none of them.
 * - `delivered` gives way to every failure. A mail server can accept a message and bounce
 *   it afterwards, and a late `delivered` must not hide a failure.
 * - When two failures disagree, the one that more firmly rules out sending again wins:
 *   `failed`, then `bounced`, then `suppressed`.
 * - `complained` outranks everything. A complaint after `delivered` is stored as a
 *   complaint and no later event replaces it.
 *
 * An event that reports the attempt's current outcome again changes nothing, so the first
 * one applied keeps its time and detail.
 */
const OUTCOME_PRECEDENCE: Record<EmailDeliveryOutcome, number> = {
  queued: 0,
  sent: 1,
  delivery_delayed: 2,
  delivered: 3,
  failed: 4,
  bounced: 5,
  suppressed: 6,
  complained: 7,
};

export function shouldApplyProviderOutcome(
  current: EmailDeliveryOutcome,
  reported: ProviderOutcome,
): boolean {
  return OUTCOME_PRECEDENCE[reported] > OUTCOME_PRECEDENCE[current];
}

/**
 * Shape of a provider classification such as `Permanent` or `reached_daily_quota`. Resend
 * doesn't publish a closed set, so any value of this shape is kept and anything that could
 * be free-form text is dropped.
 */
export const PROVIDER_CODE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

const providerCode = z.string().regex(PROVIDER_CODE).optional().catch(undefined);
const outcomeDetail = z
  .object({
    bounceType: providerCode,
    bounceSubtype: providerCode,
    failureReason: providerCode,
    suppressionType: providerCode,
  })
  .catch({});

/**
 * Provider codes behind an attempt's outcome. A bounce is permanent, transient or
 * undetermined according to `bounceType`.
 */
export type EmailOutcomeDetail = z.infer<typeof outcomeDetail>;

/** Serializes an event's provider codes for `email_delivery_attempts.outcome_detail`. */
export function formatOutcomeDetail(codes: {
  [Code in keyof EmailOutcomeDetail]-?: string | null;
}): string | null {
  const detail = outcomeDetail.parse(codes);
  return Object.values(detail).some((code) => code !== undefined) ? JSON.stringify(detail) : null;
}

export function parseOutcomeDetail(detail: string | null): EmailOutcomeDetail {
  if (detail === null) return {};

  try {
    return outcomeDetail.parse(JSON.parse(detail));
  } catch {
    return {};
  }
}
