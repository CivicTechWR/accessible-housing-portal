/**
 * @jest-environment node
 */
import { createHmac, randomBytes } from "node:crypto";

import { afterEach, describe, expect, it, jest } from "@jest/globals";

import {
  InvalidResendWebhookSignatureError,
  verifyAndNormalizeResendWebhook,
} from "@/lib/email-delivery/resend-webhook";

const EVENT_CREATED_AT = "2026-09-23T14:30:00.000Z";
const WEBHOOK_ID = "msg_webhook_123";

afterEach(() => {
  jest.restoreAllMocks();
});

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
      failureReason: null,
      suppressionType: null,
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
    expect(JSON.stringify(result)).not.toContain("user@example.com");
    expect(JSON.stringify(result)).not.toContain("mail.example.com");
  });

  it.each([
    [
      "email.failed",
      { failed: { reason: "reached_daily_quota" } },
      { failureReason: "reached_daily_quota" },
    ],
    [
      "email.suppressed",
      {
        suppressed: { type: "OnAccountSuppressionList", message: "user@example.com is suppressed" },
      },
      { suppressionType: "OnAccountSuppressionList" },
    ],
    [
      "email.failed",
      { failed: { reason: "Could not deliver to user@example.com" } },
      { failureReason: null },
    ],
    [
      "email.bounced",
      { bounce: { type: "Permanent", subType: "Rejected by user@example.com" } },
      { bounceType: "Permanent", bounceSubtype: null },
    ],
  ] as const)("keeps %s codes only when they are short codes", (type, detail, expected) => {
    const result = verifyAndNormalizeResendWebhook(
      signedWebhook({ type, created_at: EVENT_CREATED_AT, data: { ...emailData(), ...detail } }),
    );

    expect(result).toMatchObject(expected);
    expect(JSON.stringify(result)).not.toContain("user@example.com");
  });

  it("stores a bounce without details with null bounce fields", () => {
    expect(
      verifyAndNormalizeResendWebhook(
        signedWebhook({ type: "email.bounced", created_at: EVENT_CREATED_AT, data: emailData() }),
      ),
    ).toMatchObject({ eventType: "email.bounced", bounceType: null, bounceSubtype: null });
  });

  it.each([
    ["an array", ["account_invite"], null],
    [
      "non-string values",
      { email_type: 42, delivery_id: "delivery-123", attempt_id: null },
      "delivery-123",
    ],
  ])("stores an event whose tags are %s", (_case, tags, deliveryIdTag) => {
    expect(
      verifyAndNormalizeResendWebhook(
        signedWebhook({
          type: "email.delivered",
          created_at: EVENT_CREATED_AT,
          data: { ...emailData(), tags },
        }),
      ),
    ).toMatchObject({
      providerEmailId: "provider-email-123",
      emailTypeTag: null,
      deliveryIdTag,
      attemptIdTag: null,
    });
  });

  it.each([
    "email.opened",
    "email.clicked",
    "email.received",
    "email.sent",
    "email.v2.delivered",
    "email.delivery-delayed",
  ])("acknowledges %s without storing it", (type) => {
    jest.spyOn(console, "info").mockImplementation(() => undefined);

    expect(
      verifyAndNormalizeResendWebhook(
        signedWebhook({ type, created_at: EVENT_CREATED_AT, data: emailData() }),
      ),
    ).toBeNull();
  });

  it("stores a non-ISO created_at at the instant it names", () => {
    expect(
      verifyAndNormalizeResendWebhook(
        signedWebhook({
          type: "email.delivered",
          created_at: "2023-04-03 22:13:42.674981+00",
          data: emailData(),
        }),
      )?.eventCreatedAt,
    ).toEqual(new Date("2023-04-03T22:13:42.674Z"));
  });

  it.each([
    ["missing", undefined],
    ["unparseable", "yesterday"],
  ])("stores the signed timestamp when created_at is %s", (_case, created_at) => {
    const signed = signedWebhook({ type: "email.delivered", created_at, data: emailData() });

    expect(verifyAndNormalizeResendWebhook(signed)?.eventCreatedAt).toEqual(
      new Date(Number(signed.headers.timestamp) * 1_000),
    );
  });

  it.each([
    ["no type", { created_at: EVENT_CREATED_AT, data: emailData() }],
    [
      "no email id",
      {
        type: "email.delivered",
        created_at: EVENT_CREATED_AT,
        data: { ...emailData(), email_id: "" },
      },
    ],
  ])("acknowledges a signed payload with %s without storing it", (_case, event) => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(verifyAndNormalizeResendWebhook(signedWebhook(event))).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/provider-email-123|example\.(com|net)/);
  });

  it("does not store non-email webhook events", () => {
    jest.spyOn(console, "info").mockImplementation(() => undefined);
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
    ).toThrow(InvalidResendWebhookSignatureError);
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
