/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { POST } from "@/app/api/webhooks/resend/route";
import {
  ingestResendWebhook,
  InvalidResendWebhookError,
} from "@/lib/email-delivery/resend-webhook";

jest.mock("@/lib/email-delivery/resend-webhook", () => ({
  ingestResendWebhook: jest.fn(),
  InvalidResendWebhookError: class InvalidResendWebhookError extends Error {},
}));

const ingest = jest.mocked(ingestResendWebhook);
const originalSecret = process.env.RESEND_WEBHOOK_SECRET;

beforeEach(() => {
  process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
  ingest.mockReset();
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
  else process.env.RESEND_WEBHOOK_SECRET = originalSecret;
  jest.restoreAllMocks();
});

describe("POST /api/webhooks/resend", () => {
  it("rejects requests without all signature headers", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/resend", { method: "POST" }),
    );

    expect(response.status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("passes the unmodified request body to verification", async () => {
    const payload = '{ "type": "email.delivered" }';
    ingest.mockResolvedValue({ status: "recorded" });

    const response = await POST(request(payload));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, status: "recorded" });
    expect(ingest).toHaveBeenCalledWith({
      payload,
      headers: { id: "webhook-id", timestamp: "123", signature: "v1,signature" },
      webhookSecret: "whsec_test",
    });
  });

  it("acknowledges a duplicate delivery without reinserting it", async () => {
    ingest.mockResolvedValue({ status: "duplicate" });

    const response = await POST(request("{}"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, status: "duplicate" });
  });

  it("returns 400 for a failed signature verification", async () => {
    ingest.mockRejectedValue(new InvalidResendWebhookError());

    expect((await POST(request("{}"))).status).toBe(400);
  });

  it("fails closed when the webhook secret is not configured", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    expect((await POST(request("{}"))).status).toBe(503);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("returns a retryable error when persistence fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    ingest.mockRejectedValue(new Error("database unavailable"));

    expect((await POST(request("{}"))).status).toBe(500);
  });
});

function request(body: string) {
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    body,
    headers: {
      "svix-id": "webhook-id",
      "svix-timestamp": "123",
      "svix-signature": "v1,signature",
    },
  });
}
