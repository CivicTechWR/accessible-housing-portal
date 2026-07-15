import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Resend } from "resend";

import { EmailSendError, sendEmail } from "@/lib/email";

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
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("sends through Resend with the configured sender and the idempotency key in provider options", async () => {
    const result = await sendEmail({
      to: "tenant@example.org",
      subject: "Subject line",
      text: "Plain text body",
      html: "<p>HTML body</p>",
      idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
    });

    expect(ResendMock).toHaveBeenCalledWith("re_test_key");
    expect(sendMock).toHaveBeenCalledWith(
      {
        from: "Affordable Housing Portal <no-reply@example.org>",
        to: "tenant@example.org",
        subject: "Subject line",
        text: "Plain text body",
        html: "<p>HTML body</p>",
      },
      {
        idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
      },
    );
    expect(result).toEqual({ id: "email_123" });
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
        idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
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
      idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
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
      idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
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
        idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
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
      idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
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
        idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
        signal: abortController.signal,
      }),
    ).rejects.toBe(abortReason);
  });
});
