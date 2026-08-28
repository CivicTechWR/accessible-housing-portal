import "server-only";

import type { EmailDeliveryType } from "@/db/schema";

export type EmailDeliveryAttemptRef = {
  id: string;
  deliveryId: string;
  emailType: EmailDeliveryType;
  attemptNumber: number;
  idempotencyKey: string;
};

export function getEmailDeliveryAttemptIdempotencyKey(params: {
  emailType: EmailDeliveryType;
  sourceEntityId: string;
  attemptNumber: number;
}) {
  return `${params.emailType}/${params.sourceEntityId}/attempt/${params.attemptNumber}`;
}

export function getEmailDeliveryAttemptTags(attempt: EmailDeliveryAttemptRef) {
  return [
    { name: "email_type", value: attempt.emailType },
    { name: "delivery_id", value: attempt.deliveryId },
    { name: "attempt_id", value: attempt.id },
  ];
}
