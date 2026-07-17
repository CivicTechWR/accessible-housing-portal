import "server-only";

import type { Job, PgBoss } from "pg-boss";

import { getAccountInviteEmailIdempotencyKey, sendInviteEmail } from "@/lib/auth/invite-email";
import {
  findInviteEmailJobTarget,
  markInviteEmailFailed,
  markInviteEmailSubmitted,
} from "@/lib/auth/invite-store";
import { EmailSendError } from "@/lib/email";
import {
  EMAIL_JOB_PRIORITY,
  getEmailJobMatch,
  openEmailJobSecret,
  type AccountInviteEmailJobData,
  type EmailJobData,
} from "@/lib/email-queue/email-job";
import {
  EMAIL_DEAD_LETTER_QUEUE,
  EMAIL_QUEUE,
  EMAIL_QUEUE_SCHEMA,
  getEmailQueue,
  isEmailWorkerEnabled,
} from "@/lib/email-queue/queue";

const DAY_IN_SECONDS = 24 * 60 * 60;
const DEFAULT_RATE_LIMIT_DEFER_SECONDS = 2;
/**
 * Quota/rate-limit deferrals re-enqueue the job instead of burning retries,
 * so bound the chain: past this many deferrals the provider limit is treated
 * as a persistent failure and the job falls into the retry/dead-letter cycle.
 * Generous enough for a month of daily-quota rollovers or a long rate-limit
 * burst; anything beyond that needs operational attention, not more waiting.
 */
export const MAX_EMAIL_JOB_DEFERRALS = 30;

/** Stored as the completed job's output: the audit trail for the send. */
export type EmailJobResult =
  | { status: "submitted"; providerMessageId: string | null }
  | { status: "skipped"; reason: string }
  | {
      status: "deferred";
      reason: string;
      deferredForSeconds: number;
      replacementJobId: string | null;
    };

/** Stored as the completed dead-letter job's output. */
export type EmailDeadLetterJobResult = { status: "failure_recorded" };

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

    await boss.work<EmailJobData, EmailDeadLetterJobResult>(
      EMAIL_DEAD_LETTER_QUEUE,
      { batchSize: 1 },
      async (jobs) => await processDeadLetteredEmailJob(boss, jobs[0] as Job<EmailJobData>),
    );

    console.log(
      `[email-queue] Worker started for queues "${EMAIL_QUEUE}" and "${EMAIL_DEAD_LETTER_QUEUE}".`,
    );
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

  // Job rows are retained for audit; strip the sealed secret once no attempt
  // can need it again. Submitted and skipped recoveries get by without it
  // (sentAt guard, or skip guards that run before decryption). A deferral is
  // not terminal: redacting the original before its replacement runs would
  // let a crash between redaction and completion recover the original as
  // unsendable and falsely dead-letter it, so its row keeps the secret until
  // the chain ends and the chain-wide redaction sweeps it. If the job expired
  // mid-handler, pg-boss has already failed it and a retry may own the row,
  // so leave its payload alone.
  if (result.status !== "deferred" && !job.signal.aborted) {
    await redactEmailJobSecret(boss, job);
  }

  return result;
}

/**
 * Process a job that exhausted its retries and landed in the dead letter
 * queue: record the permanent failure on the source entity so admin UIs can
 * show "failed" instead of an eternal "queued". Dead-lettering copies the
 * original payload, so the sealed secret is redacted here too — no send will
 * ever use the dead-lettered copy, the failed source row, or a deferral
 * ancestor.
 */
export async function processDeadLetteredEmailJob(
  boss: EmailWorkerBoss,
  job: Job<EmailJobData>,
): Promise<EmailDeadLetterJobResult> {
  const result = await recordEmailJobFailure(job.data);

  // As in processEmailJob: an expired job has already been failed by pg-boss
  // and a retry may own the row, so leave its payload alone.
  if (!job.signal.aborted) {
    await redactEmailJobSecret(boss, job);
  }

  return result;
}

async function recordEmailJobFailure(data: EmailJobData): Promise<EmailDeadLetterJobResult> {
  switch (data.type) {
    case "account_invite":
      await markInviteEmailFailed(data.inviteId);
      console.error(
        `[email-queue] Invite email for invite ${data.inviteId} permanently failed and was dead-lettered; the invite must be re-sent.`,
      );
      return { status: "failure_recorded" };
  }
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

    const deferralCount = (job.data.deferralCount ?? 0) + 1;

    if (deferralCount > MAX_EMAIL_JOB_DEFERRALS) {
      console.error(
        `[email-queue] ${deferral.reason} persisted through ${MAX_EMAIL_JOB_DEFERRALS} deferrals; job ${job.id} now fails into the retry/dead-letter cycle.`,
      );
      throw error;
    }

    const replacementJobId = await boss.sendAfter(
      EMAIL_QUEUE,
      { ...job.data, deferralCount },
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

  // The worker only sets sentAt after the provider accepts the send request,
  // so this invite was already submitted. This is how a job recovered after a
  // crash (or an expired attempt whose request still landed) completes instead
  // of re-submitting — its payload secret may already be redacted by then.
  if (target.sentAt) {
    return { status: "skipped", reason: "invite_already_submitted" };
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

  const submission = await sendInviteEmail({
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

  await markInviteEmailSubmitted(data.inviteId);

  return { status: "submitted", providerMessageId: submission?.id ?? null };
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

/**
 * One logical email can span several job rows: each quota deferral completes
 * its row with the payload intact (see processEmailJob) and enqueues a fresh
 * replacement, and dead-lettering copies the payload while leaving the failed
 * source row behind. Redact every settled row for the logical email, not just
 * the finishing job's; the state filter keeps queued and retrying rows —
 * which still need the secret — untouched.
 */
async function redactEmailJobSecret(boss: EmailWorkerBoss, job: Job<EmailJobData>) {
  if (!("secret" in job.data)) {
    return;
  }

  await boss.getDb().executeSql(
    `UPDATE ${EMAIL_QUEUE_SCHEMA}.job
        SET data = data - 'secret'
      WHERE name IN ($1, $2)
        AND data @> $3::jsonb
        AND (id = $4 OR state IN ('completed', 'failed', 'cancelled'))`,
    [EMAIL_QUEUE, EMAIL_DEAD_LETTER_QUEUE, JSON.stringify(getEmailJobMatch(job.data)), job.id],
  );
}
