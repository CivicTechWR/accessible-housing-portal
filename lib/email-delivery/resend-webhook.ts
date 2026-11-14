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

// Only `type`, `created_at`, and `data.email_id` are required. A signed payload that fails
// here is rejected, and Resend's retry would fail the same way, so every other field is
// best effort and becomes null when missing or malformed.
const operationalEvent = z.object({
  type: z.enum([
    "email.delivered",
    "email.delivery_delayed",
    "email.bounced",
    "email.failed",
    "email.suppressed",
    "email.complained",
  ]),
  created_at: z.iso.datetime({ offset: true }),
  data: z.object({
    email_id: z.string().min(1),
    tags: z.object({ email_type: tag, delivery_id: tag, attempt_id: tag }).nullable().catch(null),
    bounce: z.object({ type: shortCode, subType: shortCode }).nullable().catch(null),
    failed: z.object({ reason: shortCode }).nullable().catch(null),
    suppressed: z.object({ type: shortCode }).nullable().catch(null),
  }),
});

export type ResendWebhookHeaders = {
  id: string;
  timestamp: string;
  signature: string;
};

export type ResendWebhookIngestResult =
  | { status: "recorded" }
  | { status: "duplicate" }
  | { status: "ignored" };

export class InvalidResendWebhookError extends Error {
  constructor(message = "Invalid Resend webhook.") {
    super(message);
    this.name = "InvalidResendWebhookError";
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
 * event, which is acknowledged without being stored.
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
    throw new InvalidResendWebhookError();
  }

  // Only a short-code-shaped type is ever logged, never the payload.
  const type = z.object({ type: z.string().regex(/^[a-z._]{1,64}$/) }).safeParse(verified)
    .data?.type;

  if (type && !operationalEvent.shape.type.safeParse(type).success) {
    // Logged so a webhook subscribed to extra events is noticed.
    console.info(
      `[resend-webhook] Acknowledged unsupported event type "${type}" without storing it.`,
    );
    return null;
  }

  const parsed = operationalEvent.safeParse(verified);

  if (!parsed.success) {
    console.warn(`[resend-webhook] Rejected a malformed ${type ? `"${type}"` : "untyped"} event.`);
    throw new InvalidResendWebhookError();
  }

  const { type: eventType, created_at, data } = parsed.data;

  return {
    svixId: params.headers.id,
    eventType,
    providerEmailId: data.email_id,
    eventCreatedAt: new Date(created_at),
    emailTypeTag: data.tags?.email_type ?? null,
    deliveryIdTag: data.tags?.delivery_id ?? null,
    attemptIdTag: data.tags?.attempt_id ?? null,
    bounceType: data.bounce?.type ?? null,
    bounceSubtype: data.bounce?.subType ?? null,
    failureReason: data.failed?.reason ?? null,
    suppressionType: data.suppressed?.type ?? null,
  };
}
