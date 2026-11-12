import "server-only";

import { Resend } from "resend";
import { z } from "zod";

import {
  recordResendWebhookEvent,
  type ResendWebhookEventRecord,
} from "@/lib/email-delivery/resend-webhook-store";

// Provider classifications such as `reached_daily_quota` or `OnAccountSuppressionList`.
// Resend doesn't publish a closed set, so keep any value of this shape and drop anything
// that could be free-form text.
const SHORT_CODE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const shortCode = z.string().regex(SHORT_CODE).nullable().catch(null);

const emailData = z.object({
  email_id: z.string().min(1),
  tags: z.record(z.string(), z.string()).optional(),
});

const eventBase = { created_at: z.iso.datetime({ offset: true }) };

const operationalEvent = z.discriminatedUnion("type", [
  z.object({
    ...eventBase,
    type: z.enum(["email.delivered", "email.delivery_delayed", "email.complained"]),
    data: emailData,
  }),
  z.object({
    ...eventBase,
    type: z.literal("email.bounced"),
    data: emailData.extend({
      bounce: z.object({ type: z.string().min(1), subType: z.string().min(1) }),
    }),
  }),
  z.object({
    ...eventBase,
    type: z.literal("email.failed"),
    data: emailData.extend({ failed: z.object({ reason: shortCode }).optional() }),
  }),
  z.object({
    ...eventBase,
    type: z.literal("email.suppressed"),
    data: emailData.extend({ suppressed: z.object({ type: shortCode }).optional() }),
  }),
]);

const OPERATIONAL_EVENT_TYPES = new Set<string>([
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.failed",
  "email.suppressed",
  "email.complained",
] satisfies z.infer<typeof operationalEvent>["type"][]);

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

  if (type && !OPERATIONAL_EVENT_TYPES.has(type)) {
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

  const event = parsed.data;
  const tags = event.data.tags;

  return {
    svixId: params.headers.id,
    eventType: event.type,
    providerEmailId: event.data.email_id,
    eventCreatedAt: new Date(event.created_at),
    emailTypeTag: tags?.email_type ?? null,
    deliveryIdTag: tags?.delivery_id ?? null,
    attemptIdTag: tags?.attempt_id ?? null,
    bounceType: event.type === "email.bounced" ? event.data.bounce.type : null,
    bounceSubtype: event.type === "email.bounced" ? event.data.bounce.subType : null,
    failureReason: event.type === "email.failed" ? (event.data.failed?.reason ?? null) : null,
    suppressionType:
      event.type === "email.suppressed" ? (event.data.suppressed?.type ?? null) : null,
  };
}
