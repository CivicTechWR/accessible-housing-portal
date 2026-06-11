import "server-only";

import { Resend } from "resend";

export type TransactionalEmailSendOptions = {
  /**
   * Stable key for the logical email, such as account_invite/<inviteId>.
   * Do not use a random per-attempt value or provider retries can duplicate sends.
   */
  idempotencyKey: string;
  /** Hard upper bound on the provider call; the attempt fails past it. */
  timeoutMs?: number;
};

const DEFAULT_SEND_TIMEOUT_MS = 15_000;

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
 *
 * The send is raced against a hard deadline so a hanging provider connection
 * cannot stall a worker or a drain call. The SDK does not expose an abort
 * signal, so the abandoned request may still deliver; that is safe because
 * the retry reuses the same idempotency key (Resend dedupes) and stale job
 * outcome writes require claim ownership.
 */
export async function sendTransactionalEmail(
  params: {
    to: string;
  } & TransactionalEmailContent &
    TransactionalEmailSendOptions,
) {
  const resend = createResendClient();
  const timeoutMs = params.timeoutMs ?? DEFAULT_SEND_TIMEOUT_MS;

  const result = await withSendTimeout(
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
    timeoutMs,
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data?.id ?? null;
}

async function withSendTimeout<T>(send: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      send,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Email provider did not respond within ${timeoutMs}ms.`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
