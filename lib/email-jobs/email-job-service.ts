import "server-only";

import { db } from "@/db";
import type { EmailJob } from "@/db/schema";
import {
  DEFAULT_MAX_ATTEMPTS,
  getRetryDelayMs,
  sanitizeEmailJobError,
} from "@/lib/email-jobs/email-job-policy";
import {
  claimEmailJobById,
  claimNextDueEmailJob,
  countEmailJobsByStatus,
  failExhaustedEmailJobs,
  findEmailJobByIdempotencyKey,
  insertEmailJob,
  markEmailJobCanceled,
  markEmailJobFailed,
  markEmailJobSent,
  scheduleEmailJobRetry,
  type EmailJobDbExecutor,
} from "@/lib/email-jobs/email-job-store";
import { EmailJobCanceledError } from "@/lib/email-jobs/errors";
import { emailJobHandlers } from "@/lib/email-jobs/handlers";
import { encryptSecretContext } from "@/lib/email-jobs/secret-context";
import type {
  DrainEmailJobsSummary,
  EmailJobOutcome,
  EnqueueEmailJobInput,
  EnqueueEmailJobResult,
} from "@/lib/email-jobs/types";

const DEFAULT_DRAIN_TIME_BUDGET_MS = 50 * 1000;

/**
 * Durably records an email to send. Pass the surrounding transaction as the
 * executor to get outbox semantics: the job commits or rolls back together
 * with the entity that triggered it. Re-enqueueing the same idempotency key
 * returns the existing job instead of creating a duplicate.
 */
export async function enqueueEmailJob(
  input: EnqueueEmailJobInput,
  options?: { executor?: EmailJobDbExecutor },
): Promise<EnqueueEmailJobResult> {
  const executor = options?.executor ?? db;

  const job = await insertEmailJob(executor, {
    type: input.type,
    payload: input.payload,
    secretContext: encryptSecretContext(input.secretContext),
    idempotencyKey: input.idempotencyKey,
    recipientEmail: input.recipientEmail,
    maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    runAfter: input.runAfter ?? new Date(),
  });

  if (job) {
    return { job, created: true };
  }

  const existing = await findEmailJobByIdempotencyKey(executor, input.idempotencyKey);

  if (!existing) {
    throw new Error(`Email job ${input.idempotencyKey} could not be enqueued or found.`);
  }

  return { job: existing, created: false };
}

/**
 * Runs a job that was already claimed (status=processing, attempts bumped)
 * and records the outcome. Unexpected errors retry with bounded backoff until
 * attempts are exhausted, then the job is dead-lettered as failed.
 *
 * Every outcome write presents the claim's claimed_at token, so a writer
 * whose lease expired and whose job was reclaimed cannot overwrite the new
 * owner's state; the returned outcome then describes an attempt that was not
 * recorded (the provider idempotency key keeps the email itself exactly-once).
 */
export async function processClaimedEmailJob(job: EmailJob): Promise<EmailJobOutcome> {
  const claimedAt = job.claimedAt;

  if (!claimedAt) {
    throw new Error(`Email job ${job.id} has no claim; only claimed jobs can be processed.`);
  }

  try {
    const { providerMessageId } = await emailJobHandlers[job.type](job);

    warnIfClaimSuperseded(
      await markEmailJobSent(job.id, { providerMessageId, claimedAt }),
      job,
      "sent",
    );

    return "sent";
  } catch (error) {
    if (error instanceof EmailJobCanceledError) {
      warnIfClaimSuperseded(
        await markEmailJobCanceled(job.id, { reason: sanitizeEmailJobError(error), claimedAt }),
        job,
        "canceled",
      );

      return "canceled";
    }

    const sanitizedError = sanitizeEmailJobError(error);

    if (job.attempts >= job.maxAttempts) {
      warnIfClaimSuperseded(
        await markEmailJobFailed(job.id, { error: sanitizedError, claimedAt }),
        job,
        "failed",
      );

      return "failed";
    }

    warnIfClaimSuperseded(
      await scheduleEmailJobRetry(job.id, {
        runAfter: new Date(Date.now() + getRetryDelayMs(job.attempts)),
        error: sanitizedError,
        claimedAt,
      }),
      job,
      "retried",
    );

    return "retried";
  }
}

function warnIfClaimSuperseded(recorded: boolean, job: EmailJob, outcome: EmailJobOutcome) {
  if (!recorded) {
    console.warn(
      `Email job ${job.id} outcome "${outcome}" was not recorded: the claim expired and the job was reclaimed by another worker.`,
    );
  }
}

/**
 * Claims and processes due jobs until the queue is drained or the time budget
 * is spent. Safe to run from several workers at once.
 *
 * Jobs are claimed strictly one at a time: a claim burns an attempt, so a
 * batch claim would let one hung send (or a killed worker) exhaust the
 * attempts of jobs that were never processed. With single claims, a stall
 * costs at most the attempt of the job that actually stalled, and the time
 * budget is re-checked before every claim.
 */
export async function drainEmailJobs(
  options: { timeBudgetMs?: number } = {},
): Promise<DrainEmailJobsSummary> {
  const timeBudgetMs = options.timeBudgetMs ?? DEFAULT_DRAIN_TIME_BUDGET_MS;
  const startedAt = Date.now();

  const summary: DrainEmailJobsSummary = {
    claimed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    canceled: 0,
    backlog: { pending: 0, failed: 0 },
  };

  summary.failed += await failExhaustedEmailJobs();

  while (Date.now() - startedAt < timeBudgetMs) {
    const job = await claimNextDueEmailJob();

    if (!job) {
      break;
    }

    summary.claimed += 1;

    const outcome = await processClaimedEmailJob(job);
    summary[outcome] += 1;
  }

  summary.backlog.pending = await countEmailJobsByStatus("pending");
  summary.backlog.failed = await countEmailJobsByStatus("failed");

  return summary;
}

const DEFAULT_IMMEDIATE_PROCESS_TIMEOUT_MS = 5_000;

/**
 * Best-effort immediate delivery right after enqueueing, so the common case
 * does not wait for a worker poll. Never throws: on any error the job stays
 * in the queue and the retry/backoff machinery owns it from here. Returns the
 * job outcome, or null when the job could not be claimed or processed within
 * the deadline, so callers can report delivery status truthfully instead of
 * assuming success.
 *
 * The deadline bounds the caller's request, but it does NOT cancel the
 * in-flight attempt (the provider call itself is bounded by the send timeout
 * in lib/email.ts). If the runtime keeps the process alive, a late outcome is
 * still recorded as long as this attempt's claim is held; once the lease
 * expires and a worker reclaims the job, the stale write becomes a no-op and
 * the provider idempotency key prevents a double-send in case the original
 * attempt did reach Resend.
 */
export async function tryProcessEmailJobNow(
  jobId: string,
  options: { timeoutMs?: number } = {},
): Promise<EmailJobOutcome | null> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_IMMEDIATE_PROCESS_TIMEOUT_MS;

  try {
    return await withDeadline(
      (async (): Promise<EmailJobOutcome | null> => {
        const job = await claimEmailJobById(jobId);

        if (!job) {
          return null;
        }

        return processClaimedEmailJob(job);
      })(),
      timeoutMs,
    );
  } catch (error) {
    console.error(`Immediate processing of email job ${jobId} failed; left for the worker.`, error);

    return null;
  }
}

function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
