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
  const resend = createResendClient();
  const result = await resend.emails.send(
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

function parseRetryAfterSeconds(headers: Record<string, string> | null | undefined) {
  const retryAfter = Number.parseInt(headers?.["retry-after"] ?? "", 10);

  return Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : null;
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
