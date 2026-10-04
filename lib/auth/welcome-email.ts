import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { emailDeliveryAttempts } from "@/db/schema";
import { buildWelcomeEmail, type WelcomeEmailAudience } from "@/lib/auth/welcome-email-template";
import { sendEmail, type TransactionalEmailSendOptions } from "@/lib/email";
import { openEmailJobSecret, sealEmailJobSecret } from "@/lib/email-queue/email-job";

const welcomeMessageSchema = z.object({
  to: z.string(),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});

export async function sendWelcomeEmail(
  params: {
    email: string;
    fullName: string;
    audience: WelcomeEmailAudience;
    platformUrl: string;
    signal?: AbortSignal;
  } & TransactionalEmailSendOptions,
) {
  const sealedPayload = sealEmailJobSecret(
    JSON.stringify({ ...buildWelcomeEmail(params), to: params.email }),
  );
  // The first sender fixes the message for this attempt, including concurrent retries.
  const [attempt] = await db
    .update(emailDeliveryAttempts)
    .set({ sealedPayload: sql`coalesce(${emailDeliveryAttempts.sealedPayload}, ${sealedPayload})` })
    .where(eq(emailDeliveryAttempts.id, params.attempt.id))
    .returning({ sealedPayload: emailDeliveryAttempts.sealedPayload });

  if (!attempt?.sealedPayload) {
    throw new Error(`Welcome email attempt ${params.attempt.id} is unavailable.`);
  }

  const message = welcomeMessageSchema.parse(JSON.parse(openEmailJobSecret(attempt.sealedPayload)));
  return sendEmail({
    ...message,
    attempt: params.attempt,
    signal: params.signal,
  });
}
