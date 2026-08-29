import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Resend } from "resend";

import type { EmailDeliveryAttemptRef } from "@/lib/email-delivery/attempt";
import { recordEmailDeliveryAttemptSubmission } from "@/lib/email-delivery/store";
import { EmailSendError, sendEmail } from "@/lib/email";

jest.mock("@/lib/email-delivery/store", () => ({
  recordEmailDeliveryAttemptSubmission: jest.fn(),
}));

const recordSubmissionMock = jest.mocked(recordEmailDeliveryAttemptSubmission);

const ATTEMPT: EmailDeliveryAttemptRef = {
  id: "0f5cce0c-92e5-4ab0-a06d-21c5a8f4ff79",
  deliveryId: "6d5a1a9a-8f1f-4d1e-9a2e-3b0f5a2c7d11",
  emailType: "account_invite",
  attemptNumber: 1,
  idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204/attempt/1",
};

const sendMock = jest.fn<
  (...args: unknown[]) => Promise<{
    data: { id: string } | null;
    error: { message: string; name?: string; statusCode?: number } | null;
    headers?: Record<string, string> | null;
  }>
>();

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: (...args: unknown[]) => sendMock(...args),
    },
  })),
}));

const ResendMock = jest.mocked(Resend);

const ORIGINAL_ENV = process.env;

describe("sendEmail", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      RESEND_API_KEY: "re_test_key",
      EMAIL_FROM: "Affordable Housing Portal <no-reply@example.org>",
    };
    ResendMock.mockClear();
    sendMock.mockReset();
    recordSubmissionMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("submits under the attempt's idempotency key with non-sensitive correlation tags", async () => {
    const result = await sendEmail({
      to: "tenant@example.org",
      subject: "Subject line",
      text: "Plain text body",
      html: "<p>HTML body</p>",
      attempt: ATTEMPT,
    });

    expect(ResendMock).toHaveBeenCalledWith("re_test_key");
    expect(sendMock).toHaveBeenCalledWith(
      {
        from: "Affordable Housing Portal <no-reply@example.org>",
        to: "tenant@example.org",
        subject: "Subject line",
        text: "Plain text body",
        html: "<p>HTML body</p>",
        tags: [
          { name: "email_type", value: "account_invite" },
          { name: "delivery_id", value: ATTEMPT.deliveryId },
          { name: "attempt_id", value: ATTEMPT.id },
        ],
      },
      {
        idempotencyKey: ATTEMPT.idempotencyKey,
      },
    );
    expect(result).toEqual({ id: "email_123" });
  });

  it("persists the Resend email id on the attempt once the provider accepts the send", async () => {
    await sendEmail({
      to: "tenant@example.org",
      subject: "Subject line",
      text: "Plain text body",
      html: "<p>HTML body</p>",
      attempt: ATTEMPT,
    });

    expect(recordSubmissionMock).toHaveBeenCalledWith({
      attemptId: ATTEMPT.id,
      providerEmailId: "email_123",
    });
  });

  it("surfaces provider errors to the caller", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Daily quota exceeded" },
    });

    await expect(
      sendEmail({
        to: "tenant@example.org",
        subject: "Subject line",
        text: "Plain text body",
        html: "<p>HTML body</p>",
        attempt: ATTEMPT,
      }),
    ).rejects.toThrow("Daily quota exceeded");
  });

  it("throws a structured EmailSendError with Retry-After parsed case-insensitively", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Too many requests", name: "rate_limit_exceeded", statusCode: 429 },
      headers: { "Retry-After": "120" },
    });

    const error = await sendEmail({
      to: "tenant@example.org",
      subject: "Subject line",
      text: "Plain text body",
      html: "<p>HTML body</p>",
      attempt: ATTEMPT,
    }).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(EmailSendError);
    expect(error).toMatchObject({
      code: "rate_limit_exceeded",
      statusCode: 429,
      retryAfterSeconds: 120,
    });
  });

  it("parses an HTTP-date Retry-After into delay seconds", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Too many requests", name: "rate_limit_exceeded", statusCode: 429 },
      headers: { "retry-after": new Date(Date.now() + 90_000).toUTCString() },
    });

    const error = (await sendEmail({
      to: "tenant@example.org",
      subject: "Subject line",
      text: "Plain text body",
      html: "<p>HTML body</p>",
      attempt: ATTEMPT,
    }).catch((thrown: unknown) => thrown)) as EmailSendError;

    expect(error.retryAfterSeconds).toBeGreaterThanOrEqual(85);
    expect(error.retryAfterSeconds).toBeLessThanOrEqual(91);
  });

  it("rejects without calling the provider when the signal is already aborted", async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      sendEmail({
        to: "tenant@example.org",
        subject: "Subject line",
        text: "Plain text body",
        html: "<p>HTML body</p>",
        attempt: ATTEMPT,
        signal: abortController.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("stops waiting on an in-flight send when the signal aborts", async () => {
    sendMock.mockReturnValue(new Promise(() => {}));
    const abortController = new AbortController();

    const pendingSend = sendEmail({
      to: "tenant@example.org",
      subject: "Subject line",
      text: "Plain text body",
      html: "<p>HTML body</p>",
      attempt: ATTEMPT,
      signal: abortController.signal,
    });
    abortController.abort();

    await expect(pendingSend).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects if the signal aborts before the in-flight listener is attached", async () => {
    const abortController = new AbortController();
    const abortReason = new Error("Email job expired.");
    sendMock.mockImplementation(() => {
      abortController.abort(abortReason);
      return new Promise(() => {});
    });

    await expect(
      sendEmail({
        to: "tenant@example.org",
        subject: "Subject line",
        text: "Plain text body",
        html: "<p>HTML body</p>",
        attempt: ATTEMPT,
        signal: abortController.signal,
      }),
    ).rejects.toBe(abortReason);
  });
});
