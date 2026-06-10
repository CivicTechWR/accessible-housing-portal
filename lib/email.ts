import "server-only";

import { Resend } from "resend";

export type TransactionalEmailSendOptions = {
  /**
   * Stable key for the logical email, such as account_invite/<inviteId>.
   * Do not use a random per-attempt value or provider retries can duplicate sends.
   */
  idempotencyKey: string;
};

export function getEmailFromAddress() {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM is not set.");
  }

  return from;
}

export function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }

  return new Resend(apiKey);
}

export type TransactionalEmailContent = {
  subject: string;
  text: string;
  html: string;
};

/**
 * Single Resend call site for transactional email. Only the email job worker
 * should call this; feature code enqueues jobs via lib/email-jobs instead.
 */
export async function sendTransactionalEmail(
  params: {
    to: string;
  } & TransactionalEmailContent &
    TransactionalEmailSendOptions,
) {
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
    throw new Error(result.error.message);
  }

  return result.data?.id ?? null;
}
