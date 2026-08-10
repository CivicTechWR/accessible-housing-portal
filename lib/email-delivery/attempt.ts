import "server-only";

import type { EmailDeliveryType } from "@/db/schema";

export type EmailDeliveryAttemptRef = {
  id: string;
  deliveryId: string;
  emailType: EmailDeliveryType;
  attemptNumber: number;
  idempotencyKey: string;
  /** Legacy attempts omit tags because their original Resend payload had none. */
  adopted?: boolean;
};

export function getEmailDeliveryAttemptIdempotencyKey(params: {
  emailType: EmailDeliveryType;
  sourceEntityId: string;
  attemptNumber: number;
}) {
  return `${params.emailType}/${params.sourceEntityId}/attempt/${params.attemptNumber}`;
}

export function getEmailDeliveryAttemptTags(attempt: EmailDeliveryAttemptRef) {
  if (attempt.adopted) {
    return undefined;
  }

  return [
    { name: "email_type", value: attempt.emailType },
    { name: "delivery_id", value: attempt.deliveryId },
    { name: "attempt_id", value: attempt.id },
  ];
}
