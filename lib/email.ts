import "server-only";

import { Resend } from "resend";

export type TransactionalEmailSendOptions = {
  /**
   * Stable key for the logical email, such as account_invite/<inviteId>.
   * Do not use a random per-attempt value or provider retries can duplicate sends.
   */
  idempotencyKey: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /**
   * Rejects the send when aborted (the queue worker passes its job signal so
   * an expired job stops before mutating any state). The provider request
   * itself cannot be cancelled; the idempotency key keeps a late delivery
   * safe to retry.
   */
  signal?: AbortSignal;
} & TransactionalEmailSendOptions;

/**
 * Provider failure with enough structure for the email queue worker to pick a
 * retry strategy: `code` is Resend's error name (such as rate_limit_exceeded,
 * daily_quota_exceeded, monthly_quota_exceeded).
 */
export class EmailSendError extends Error {
  readonly code: string | null;
  readonly statusCode: number | null;
  /** Parsed from the provider's Retry-After response header, when present. */
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    details: { code: string | null; statusCode: number | null; retryAfterSeconds: number | null },
  ) {
    super(message);
    this.name = "EmailSendError";
    this.code = details.code;
    this.statusCode = details.statusCode;
    this.retryAfterSeconds = details.retryAfterSeconds;
  }
}

export async function sendEmail(params: SendEmailParams) {
  throwIfAborted(params.signal);

  const resend = createResendClient();
  const result = await rejectOnAbort(
    resend.emails.send(
      {
        from: getEmailFromAddress(),
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      },
      {
        idempotencyKey: params.idempotencyKey,
      },
    ),
    params.signal,
  );

  if (result.error) {
    throw new EmailSendError(result.error.message, {
      code: result.error.name ?? null,
      statusCode: result.error.statusCode ?? null,
      retryAfterSeconds: parseRetryAfterSeconds(result.headers),
    });
  }

  return result.data;
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw new Error("Email send aborted before it started.");
  }
}

/**
 * The Resend SDK does not accept an AbortSignal, so the in-flight request is
 * left to settle on its own; this only stops the caller from waiting on (and
 * acting after) an abort.
 */
function rejectOnAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error("Email send aborted while in flight."));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/**
 * Retry-After is either delay-seconds or an HTTP-date (RFC 9110); header name
 * casing is not guaranteed.
 */
function parseRetryAfterSeconds(headers: Record<string, string> | null | undefined) {
  const value = Object.entries(headers ?? {})
    .find(([name]) => name.toLowerCase() === "retry-after")?.[1]
    ?.trim();

  if (!value) {
    return null;
  }

  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  const resetAt = Date.parse(value);

  return Number.isNaN(resetAt) ? null : Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
}

function getEmailFromAddress() {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM is not set.");
  }

  return from;
}

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }

  return new Resend(apiKey);
}
