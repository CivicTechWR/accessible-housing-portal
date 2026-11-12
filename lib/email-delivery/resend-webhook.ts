import "server-only";

import { Resend, type WebhookEventPayload } from "resend";

import {
  recordResendWebhookEvent,
  type ResendWebhookEventRecord,
} from "@/lib/email-delivery/resend-webhook-store";

const SUPPORTED_EVENT_TYPES = new Set([
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.failed",
  "email.suppressed",
  "email.complained",
]);

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

export function verifyAndNormalizeResendWebhook(params: {
  payload: string;
  headers: ResendWebhookHeaders;
  webhookSecret: string;
}): ResendWebhookEventRecord | null {
  let event: WebhookEventPayload;

  try {
    // Resend's webhook verifier is local-only, but its SDK constructor still
    // requires an API-key-shaped value. Do not couple webhook verification to
    // RESEND_API_KEY: the signing secret is the only credential used here.
    event = new Resend("webhook-verification-only").webhooks.verify({
      payload: params.payload,
      headers: params.headers,
      webhookSecret: params.webhookSecret,
    });
  } catch {
    throw new InvalidResendWebhookError();
  }

  if (!event.type.startsWith("email.")) {
    return null;
  }

  if (!("email_id" in event.data) || typeof event.data.email_id !== "string") {
    throw new InvalidResendWebhookError();
  }

  const eventCreatedAt = new Date(event.created_at);

  if (Number.isNaN(eventCreatedAt.getTime())) {
    throw new InvalidResendWebhookError();
  }

  const tags = "tags" in event.data ? event.data.tags : undefined;
  const isOperationalEvent = SUPPORTED_EVENT_TYPES.has(event.type);
  return {
    svixId: params.headers.id,
    eventType: event.type,
    providerEmailId: event.data.email_id,
    eventCreatedAt,
    emailTypeTag: tags?.email_type ?? null,
    deliveryIdTag: tags?.delivery_id ?? null,
    attemptIdTag: tags?.attempt_id ?? null,
    bounceType: event.type === "email.bounced" ? event.data.bounce.type : null,
    bounceSubtype: event.type === "email.bounced" ? event.data.bounce.subType : null,
    processingStatus: isOperationalEvent ? "pending" : "ignored",
    processedAt: isOperationalEvent ? null : new Date(),
  };
}
