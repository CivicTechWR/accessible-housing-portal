/**
 * @jest-environment node
 */
import { createHmac, randomBytes } from "node:crypto";

import { describe, expect, it } from "@jest/globals";

import {
  InvalidResendWebhookError,
  verifyAndNormalizeResendWebhook,
} from "@/lib/email-delivery/resend-webhook";

const EVENT_CREATED_AT = "2026-09-23T14:30:00.000Z";
const WEBHOOK_ID = "msg_webhook_123";

describe("verifyAndNormalizeResendWebhook", () => {
  it("verifies and normalizes an operational email event", () => {
    const result = verifyAndNormalizeResendWebhook(
      signedWebhook({
        type: "email.delivered",
        created_at: EVENT_CREATED_AT,
        data: emailData(),
      }),
    );

    expect(result).toEqual({
      svixId: WEBHOOK_ID,
      eventType: "email.delivered",
      providerEmailId: "provider-email-123",
      eventCreatedAt: new Date(EVENT_CREATED_AT),
      emailTypeTag: "account_invite",
      deliveryIdTag: "delivery-123",
      attemptIdTag: "attempt-123",
      bounceType: null,
      bounceSubtype: null,
      processingStatus: "pending",
      processedAt: null,
    });
  });

  it("keeps structured bounce classification without retaining free-form diagnostics", () => {
    const result = verifyAndNormalizeResendWebhook(
      signedWebhook({
        type: "email.bounced",
        created_at: EVENT_CREATED_AT,
        data: {
          ...emailData(),
          bounce: {
            type: "Permanent",
            subType: "General",
            message: "Mailbox user@example.com rejected https://mail.example.com/details/123",
          },
        },
      }),
    );

    expect(result).toMatchObject({
      bounceType: "Permanent",
      bounceSubtype: "General",
    });
    expect(result).not.toHaveProperty("outcomeDetail");
    expect(JSON.stringify(result)).not.toContain("user@example.com");
    expect(JSON.stringify(result)).not.toContain("mail.example.com");
  });

  it("stores minimal metadata for a non-operational email event as ignored", () => {
    const result = verifyAndNormalizeResendWebhook(
      signedWebhook({
        type: "email.opened",
        created_at: EVENT_CREATED_AT,
        data: emailData(),
      }),
    );

    expect(result).toMatchObject({
      svixId: WEBHOOK_ID,
      eventType: "email.opened",
      providerEmailId: "provider-email-123",
      eventCreatedAt: new Date(EVENT_CREATED_AT),
      processingStatus: "ignored",
      processedAt: expect.any(Date),
    });
    expect(result).not.toHaveProperty("to");
    expect(result).not.toHaveProperty("from");
    expect(result).not.toHaveProperty("subject");
  });

  it("does not store non-email webhook events", () => {
    expect(
      verifyAndNormalizeResendWebhook(
        signedWebhook({
          type: "domain.deleted",
          created_at: EVENT_CREATED_AT,
          data: {
            id: "domain-123",
            name: "example.com",
            status: "not_started",
            created_at: EVENT_CREATED_AT,
            region: "us-east-1",
            records: [],
          },
        }),
      ),
    ).toBeNull();
  });

  it("rejects an invalid signature", () => {
    const signed = signedWebhook({
      type: "email.delivered",
      created_at: EVENT_CREATED_AT,
      data: emailData(),
    });

    expect(() =>
      verifyAndNormalizeResendWebhook({
        ...signed,
        headers: { ...signed.headers, signature: "v1,invalid" },
      }),
    ).toThrow(InvalidResendWebhookError);
  });
});

function emailData() {
  return {
    email_id: "provider-email-123",
    created_at: EVENT_CREATED_AT,
    from: "Home Hub <no-reply@example.com>",
    to: ["resident@example.net"],
    subject: "Your invitation",
    tags: {
      email_type: "account_invite",
      delivery_id: "delivery-123",
      attempt_id: "attempt-123",
    },
  };
}

function signedWebhook(event: object) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const secretBytes = randomBytes(32);
  const webhookSecret = `whsec_${secretBytes.toString("base64")}`;
  const signature = createHmac("sha256", secretBytes)
    .update(`${WEBHOOK_ID}.${timestamp}.${payload}`)
    .digest("base64");

  return {
    payload,
    headers: {
      id: WEBHOOK_ID,
      timestamp,
      signature: `v1,${signature}`,
    },
    webhookSecret,
  };
}
