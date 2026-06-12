import "server-only";

import type { Job, PgBoss } from "pg-boss";

import { getAccountInviteEmailIdempotencyKey, sendInviteEmail } from "@/lib/auth/invite-email";
import { findInviteEmailJobTarget, markInviteEmailSent } from "@/lib/auth/invite-store";
import { EmailSendError } from "@/lib/email";
import {
  EMAIL_JOB_PRIORITY,
  openEmailJobSecret,
  type AccountInviteEmailJobData,
  type EmailJobData,
} from "@/lib/email-queue/email-job";
import {
  EMAIL_QUEUE,
  EMAIL_QUEUE_SCHEMA,
  getEmailQueue,
  isEmailWorkerEnabled,
} from "@/lib/email-queue/queue";

const DAY_IN_SECONDS = 24 * 60 * 60;
const DEFAULT_RATE_LIMIT_DEFER_SECONDS = 2;

/** Stored as the completed job's output: the audit trail for the send. */
export type EmailJobResult =
  | { status: "sent"; providerMessageId: string | null }
  | { status: "skipped"; reason: string }
  | {
      status: "deferred";
      reason: string;
      deferredForSeconds: number;
      replacementJobId: string | null;
    };

export type EmailWorkerBoss = Pick<PgBoss, "sendAfter" | "getDb">;

const globalForEmailWorker = globalThis as typeof globalThis & {
  __ahpEmailWorkerStarted?: boolean;
};

/**
 * Start the in-process email queue worker. Callers must already be in a
 * long-lived Node.js server; the EMAIL_WORKER_ENABLED gate keeps builds, CI,
 * tests, and scripts from starting pollers, and the globalThis guard keeps dev
 * hot reload from starting duplicates.
 */
export async function startEmailWorker() {
  if (!isEmailWorkerEnabled() || globalForEmailWorker.__ahpEmailWorkerStarted) {
    return;
  }

  globalForEmailWorker.__ahpEmailWorkerStarted = true;

  try {
    const boss = await getEmailQueue();

    await boss.work<EmailJobData, EmailJobResult>(
      EMAIL_QUEUE,
      { batchSize: 1 },
      async (jobs) => await processEmailJob(boss, jobs[0] as Job<EmailJobData>),
    );

    console.log(`[email-queue] Worker started for queue "${EMAIL_QUEUE}".`);
  } catch (error) {
    globalForEmailWorker.__ahpEmailWorkerStarted = false;
    throw error;
  }
}

/**
 * Process one email job. Returning completes the job (output = the returned
 * result); throwing fails it into pg-boss's bounded-backoff retry cycle and,
 * once retries are exhausted, the dead letter queue. Quota and rate-limit
 * failures do not burn retries: the job completes as "deferred" and an
 * identical job is scheduled for when the provider window reopens.
 */
export async function processEmailJob(
  boss: EmailWorkerBoss,
  job: Job<EmailJobData>,
): Promise<EmailJobResult> {
  const result = await runEmailJob(boss, job);

  // The completed job row is retained for audit; strip the sealed secret once
  // no attempt can need it again. Sent and skipped recoveries get by without
  // it (sentAt guard, or skip guards that run before decryption). Deferred
  // jobs keep theirs: the secret lives on in the replacement job either way,
  // and a crash between redaction and completion would otherwise recover the
  // original as unsendable and falsely dead-letter it. If the job expired
  // mid-handler, pg-boss has already failed it and a retry may own the row,
  // so leave its payload alone.
  if (result.status !== "deferred" && !job.signal.aborted) {
    await redactEmailJobSecret(boss, job);
  }

  return result;
}

async function runEmailJob(boss: EmailWorkerBoss, job: Job<EmailJobData>): Promise<EmailJobResult> {
  try {
    return await sendEmailForJob(job.data, job.signal);
  } catch (error) {
    const deferral = getProviderQuotaDeferral(error);

    if (!deferral || job.signal.aborted) {
      if (error instanceof EmailSendError && error.code === "monthly_quota_exceeded") {
        // Deferring for weeks would hide the problem; let the job retry and
        // dead-letter so the exhausted monthly quota gets operational action.
        console.error(
          `[email-queue] Resend monthly quota exceeded; job ${job.id} will dead-letter unless the quota resets first.`,
        );
      }

      // On an aborted (expired) job, pg-boss has already scheduled the retry;
      // deferring as well would duplicate the job.
      throw error;
    }

    const replacementJobId = await boss.sendAfter(
      EMAIL_QUEUE,
      job.data,
      { priority: EMAIL_JOB_PRIORITY[job.data.type] },
      deferral.seconds,
    );

    console.warn(
      `[email-queue] ${deferral.reason}; deferred job ${job.id} for ${deferral.seconds}s as job ${replacementJobId}.`,
    );

    return {
      status: "deferred",
      reason: deferral.reason,
      deferredForSeconds: deferral.seconds,
      replacementJobId,
    };
  }
}

async function sendEmailForJob(data: EmailJobData, signal: AbortSignal): Promise<EmailJobResult> {
  switch (data.type) {
    case "account_invite":
      return await sendAccountInviteEmailJob(data, signal);
  }
}

async function sendAccountInviteEmailJob(
  data: AccountInviteEmailJobData,
  signal: AbortSignal,
): Promise<EmailJobResult> {
  const target = await findInviteEmailJobTarget(data.inviteId);

  if (!target) {
    return { status: "skipped", reason: "invite_not_found" };
  }

  if (target.acceptedAt) {
    return { status: "skipped", reason: "invite_accepted" };
  }

  // The worker only sets sentAt after a successful send, so this invite's
  // email already went out. This is how a job recovered after a crash (or an
  // expired attempt whose send still landed) completes instead of re-sending
  // — its payload secret may already be redacted by then.
  if (target.sentAt) {
    return { status: "skipped", reason: "invite_already_sent" };
  }

  // Also covers superseded invites: creating a new invite expires older ones.
  if (target.expiresAt.getTime() <= Date.now()) {
    return { status: "skipped", reason: "invite_expired" };
  }

  if (!data.secret) {
    // Unsent invite with a missing secret cannot be recovered; fail into the
    // retry/dead-letter cycle so it gets operational attention.
    throw new Error(`Email job for invite ${data.inviteId} has no sealed payload secret.`);
  }

  const sent = await sendInviteEmail({
    email: target.email,
    fullName: target.fullName,
    inviteUrl: openEmailJobSecret(data.secret),
    idempotencyKey: getAccountInviteEmailIdempotencyKey(data.inviteId),
    signal,
  });

  if (signal.aborted) {
    // pg-boss expired this job mid-send and will retry it; stop before
    // touching state the retry now owns. The idempotency key reconciles the
    // provider side if this send actually landed.
    throw new Error(`Email job ${data.inviteId} expired during send.`);
  }

  await markInviteEmailSent(data.inviteId);

  return { status: "sent", providerMessageId: sent?.id ?? null };
}

function getProviderQuotaDeferral(error: unknown) {
  if (!(error instanceof EmailSendError)) {
    return null;
  }

  if (error.code === "daily_quota_exceeded") {
    // Resend does not expose an exact reset time, so defer ~24 hours instead
    // of burning retries against a closed window.
    return { reason: "daily_quota_exceeded", seconds: DAY_IN_SECONDS };
  }

  if (error.code === "rate_limit_exceeded") {
    return {
      reason: "rate_limit_exceeded",
      seconds: Math.max(error.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_DEFER_SECONDS, 1),
    };
  }

  return null;
}

async function redactEmailJobSecret(boss: EmailWorkerBoss, job: Job<EmailJobData>) {
  if (!("secret" in job.data)) {
    return;
  }

  await boss
    .getDb()
    .executeSql(
      `UPDATE ${EMAIL_QUEUE_SCHEMA}.job SET data = data - 'secret' WHERE id = $1 AND name = $2`,
      [job.id, job.name],
    );
}
