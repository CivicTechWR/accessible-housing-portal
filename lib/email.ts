import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Resend, type ErrorResponse } from "resend";

import {
  getEmailDeliveryAttemptTags,
  type EmailDeliveryAttemptRef,
} from "@/lib/email-delivery/attempt";
import { recordEmailDeliveryAttemptSubmission } from "@/lib/email-delivery/store";

export type TransactionalEmailSendOptions = {
  attempt: EmailDeliveryAttemptRef;
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
  readonly code: ErrorResponse["name"] | null;
  readonly statusCode: number | null;
  /** Parsed from the provider's Retry-After response header, when present. */
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    details: {
      code: ErrorResponse["name"] | null;
      statusCode: number | null;
      retryAfterSeconds: number | null;
    },
  ) {
    super(message);
    this.name = "EmailSendError";
    this.code = details.code;
    this.statusCode = details.statusCode;
    this.retryAfterSeconds = details.retryAfterSeconds;
  }
}

export async function sendEmail(params: SendEmailParams) {
  params.signal?.throwIfAborted();

  if (process.env.EMAIL_TRANSPORT === "capture") {
    if (process.env.NODE_ENV === "production")
      throw new Error("Email capture is only available in local development.");
    const directory = process.env.EMAIL_CAPTURE_DIR;
    if (!directory) throw new Error("EMAIL_CAPTURE_DIR is required for captured emails.");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const id = `capture-${params.attempt.id}`;
    await writeFile(
      join(directory, `${id}.json`),
      JSON.stringify(
        { id, to: params.to, subject: params.subject, text: params.text, html: params.html },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    await recordEmailDeliveryAttemptSubmission({
      attemptId: params.attempt.id,
      providerEmailId: id,
    });
    return { id };
  }
  const resend = createResendClient();
  const result = await rejectOnAbort(
    resend.emails.send(
      {
        from: getEmailFromAddress(),
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
        tags: getEmailDeliveryAttemptTags(params.attempt),
      },
      {
        idempotencyKey: params.attempt.idempotencyKey,
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

  await recordEmailDeliveryAttemptSubmission({
    attemptId: params.attempt.id,
    providerEmailId: result.data?.id ?? null,
  });

  return result.data;
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

  signal.throwIfAborted();

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
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
