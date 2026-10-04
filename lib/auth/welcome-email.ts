import "server-only";

import { buildWelcomeEmail, type WelcomeEmailAudience } from "@/lib/auth/welcome-email-template";
import { sendEmail, type TransactionalEmailSendOptions } from "@/lib/email";

export async function sendWelcomeEmail(
  params: {
    email: string;
    fullName: string;
    audience: WelcomeEmailAudience;
    platformUrl: string;
    signal?: AbortSignal;
  } & TransactionalEmailSendOptions,
) {
  return sendEmail({
    ...buildWelcomeEmail(params),
    to: params.email,
    attempt: params.attempt,
    signal: params.signal,
  });
}
