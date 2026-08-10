import "server-only";

import type { EmailDeliveryType } from "@/db/schema";

/**
 * The handle a sender carries from "an attempt exists" to "the provider
 * accepted it": its idempotency key, plus the non-sensitive ids that correlate
 * a provider-side email back to these records.
 */
export type EmailDeliveryAttemptRef = {
  id: string;
  deliveryId: string;
  emailType: EmailDeliveryType;
  attemptNumber: number;
  idempotencyKey: string;
};

/**
 * Stable key for one attempt, used both as the Resend idempotency key and as
 * the logical email key the queue derives its deterministic job id from.
 *
 * It is scoped to the attempt, not the logical email, so the two kinds of
 * repeat send stay distinguishable: an ordinary queue retry reuses its
 * attempt's key and is deduplicated by the provider, while a genuine resend is
 * a new attempt and therefore a new key that is allowed to deliver again.
 */
export function getEmailDeliveryAttemptIdempotencyKey(params: {
  emailType: EmailDeliveryType;
  sourceEntityId: string;
  attemptNumber: number;
}) {
  return `${params.emailType}/${params.sourceEntityId}/attempt/${params.attemptNumber}`;
}

/**
 * Correlation tags to attach to the provider submission, as a secondary path
 * to the attempt when the provider email id is unavailable. Values must stay
 * non-sensitive and within Resend's tag alphabet (ASCII letters, digits, `_`
 * and `-`), which opaque ids and email type names already satisfy — never put
 * a recipient address, invite URL, or token here.
 */
export function getEmailDeliveryAttemptTags(attempt: EmailDeliveryAttemptRef) {
  return [
    { name: "email_type", value: attempt.emailType },
    { name: "delivery_id", value: attempt.deliveryId },
    { name: "attempt_id", value: attempt.id },
  ];
}
