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
    throw new Error(result.error.message);
  }

  return result.data;
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
