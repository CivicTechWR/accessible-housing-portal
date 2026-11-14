import "server-only";

import { Resend } from "resend";
import { z } from "zod";

import {
  recordResendWebhookEvent,
  type ResendWebhookEventRecord,
} from "@/lib/email-delivery/resend-webhook-store";

// Provider classifications such as `Permanent` or `reached_daily_quota`. Resend doesn't
// publish a closed set, so keep any value of this shape and drop anything that could be
// free-form text.
const SHORT_CODE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const shortCode = z.string().regex(SHORT_CODE).nullable().catch(null);
const tag = z.string().nullable().catch(null);

// Resend doesn't use one timestamp format everywhere, so accept anything Date.parse reads.
// Missing or unreadable values become null and the signed svix timestamp is used instead.
const timestampMs = z
  .string()
  .transform((value) => Date.parse(value))
  .pipe(z.number())
  .nullable()
  .catch(null);

// Only `type` and `data.email_id` are required. Resend's retry of a signed payload would
// fail the same way, so every other field is best effort and becomes null when missing
// or malformed.
const operationalEvent = z.object({
  type: z.enum([
    "email.delivered",
    "email.delivery_delayed",
    "email.bounced",
    "email.failed",
    "email.suppressed",
    "email.complained",
  ]),
  created_at: timestampMs,
  data: z.object({
    email_id: z.string().min(1),
    tags: z.object({ email_type: tag, delivery_id: tag, attempt_id: tag }).nullable().catch(null),
    bounce: z.object({ type: shortCode, subType: shortCode }).nullable().catch(null),
    failed: z.object({ reason: shortCode }).nullable().catch(null),
    suppressed: z.object({ type: shortCode }).nullable().catch(null),
  }),
});

// Decides only whether an unsupported type can appear in a log line.
const LOG_SAFE_TYPE = /^[a-z._]{1,64}$/;

export type ResendWebhookHeaders = {
  id: string;
  timestamp: string;
  signature: string;
};

export type ResendWebhookIngestResult =
  | { status: "recorded" }
  | { status: "duplicate" }
  | { status: "ignored" };

export class InvalidResendWebhookSignatureError extends Error {
  constructor() {
    super("Invalid Resend webhook signature.");
    this.name = "InvalidResendWebhookSignatureError";
  }
}

export async function ingestResendWebhook(params: {
  payload: string;
  headers: ResendWebhookHeaders;
  webhookSecret: string;
}): Promise<ResendWebhookIngestResult> {
  const event = verifyAndNormalizeResendWebhook(params);

  if (!event) {
    return { status: "ignored" };
  }

  return { status: await recordResendWebhookEvent(event) };
}

/**
 * Returns the ledger row for an operational email event, or null for any other verified
 * event, which is acknowledged without being stored. Throws only when the signature
 * cannot be verified.
 */
export function verifyAndNormalizeResendWebhook(params: {
  payload: string;
  headers: ResendWebhookHeaders;
  webhookSecret: string;
}): ResendWebhookEventRecord | null {
  let verified: unknown;

  try {
    // Resend's webhook verifier is local-only, but its SDK constructor still
    // requires an API-key-shaped value. Do not couple webhook verification to
    // RESEND_API_KEY: the signing secret is the only credential used here.
    verified = new Resend("webhook-verification-only").webhooks.verify({
      payload: params.payload,
      headers: params.headers,
      webhookSecret: params.webhookSecret,
    });
  } catch {
    throw new InvalidResendWebhookSignatureError();
  }

  const type = z.object({ type: z.string() }).safeParse(verified).data?.type;

  if (type !== undefined && !operationalEvent.shape.type.safeParse(type).success) {
    // Logged so a webhook subscribed to extra events is noticed. Never log the payload.
    const label = LOG_SAFE_TYPE.test(type) ? `"${type}"` : "<not log-safe>";
    console.info(
      `[resend-webhook] Acknowledged unsupported event type ${label} without storing it.`,
    );
    return null;
  }

  const parsed = operationalEvent.safeParse(verified);

  if (!parsed.success) {
    // Only a missing type or email id gets here. A retry cannot fix either, so the event
    // is acknowledged rather than rejected. `type` is an operational type at this point.
    const problem = type ? `"${type}" event with no email id` : "event with no type";
    console.warn(`[resend-webhook] Acknowledged an unstorable ${problem}.`);
    return null;
  }

  const { type: eventType, created_at, data } = parsed.data;

  return {
    svixId: params.headers.id,
    eventType,
    providerEmailId: data.email_id,
    // The svix timestamp is in seconds and was verified with the signature.
    eventCreatedAt: new Date(created_at ?? Number(params.headers.timestamp) * 1_000),
    emailTypeTag: data.tags?.email_type ?? null,
    deliveryIdTag: data.tags?.delivery_id ?? null,
    attemptIdTag: data.tags?.attempt_id ?? null,
    bounceType: data.bounce?.type ?? null,
    bounceSubtype: data.bounce?.subType ?? null,
    failureReason: data.failed?.reason ?? null,
    suppressionType: data.suppressed?.type ?? null,
  };
}
