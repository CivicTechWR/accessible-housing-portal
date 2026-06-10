import type { EmailJob, EmailJobType } from "@/db/schema";

/**
 * Per-type job data. `payload` holds only stable entity references that are
 * safe to persist as plaintext JSON. `secretContext` holds send-time data that
 * cannot be re-derived at processing time (raw tokens, one-time links); it is
 * encrypted before it reaches Postgres and deleted once the job completes.
 */
export type EmailJobDescriptor = {
  type: "account_invite";
  payload: { inviteId: string };
  secretContext: { inviteUrl: string };
};

export type AccountInviteEmailJobSecretContext = Extract<
  EmailJobDescriptor,
  { type: "account_invite" }
>["secretContext"];

export type EnqueueEmailJobInput = EmailJobDescriptor & {
  /** Stable key for the logical email; dedupes enqueues and provider sends. */
  idempotencyKey: string;
  recipientEmail: string;
  runAfter?: Date;
  maxAttempts?: number;
};

export type EnqueueEmailJobResult = {
  job: EmailJob;
  /** False when an existing job with the same idempotency key was reused. */
  created: boolean;
};

export type EmailJobOutcome = "sent" | "retried" | "failed" | "canceled";

export type EmailJobHandlerResult = {
  providerMessageId: string | null;
};

export type EmailJobHandler = (job: EmailJob) => Promise<EmailJobHandlerResult>;

export type EmailJobHandlerRegistry = Record<EmailJobType, EmailJobHandler>;

export type DrainEmailJobsSummary = {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  canceled: number;
  backlog: {
    pending: number;
    failed: number;
  };
};
