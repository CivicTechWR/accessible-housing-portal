import "server-only";

import { db } from "@/db";
import type { EmailJob } from "@/db/schema";
import {
  DEFAULT_MAX_ATTEMPTS,
  getRetryDelayMs,
  sanitizeEmailJobError,
} from "@/lib/email-jobs/email-job-policy";
import {
  claimDueEmailJobs,
  claimEmailJobById,
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

const DEFAULT_DRAIN_BATCH_SIZE = 10;
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
 */
export async function processClaimedEmailJob(job: EmailJob): Promise<EmailJobOutcome> {
  try {
    const { providerMessageId } = await emailJobHandlers[job.type](job);

    await markEmailJobSent(job.id, { providerMessageId });

    return "sent";
  } catch (error) {
    if (error instanceof EmailJobCanceledError) {
      await markEmailJobCanceled(job.id, { reason: sanitizeEmailJobError(error) });

      return "canceled";
    }

    const sanitizedError = sanitizeEmailJobError(error);

    if (job.attempts >= job.maxAttempts) {
      await markEmailJobFailed(job.id, { error: sanitizedError });

      return "failed";
    }

    await scheduleEmailJobRetry(job.id, {
      runAfter: new Date(Date.now() + getRetryDelayMs(job.attempts)),
      error: sanitizedError,
    });

    return "retried";
  }
}

/**
 * Claims and processes due jobs until the queue is drained or the time budget
 * is spent. Safe to run from several workers at once.
 */
export async function drainEmailJobs(
  options: { batchSize?: number; timeBudgetMs?: number } = {},
): Promise<DrainEmailJobsSummary> {
  const batchSize = options.batchSize ?? DEFAULT_DRAIN_BATCH_SIZE;
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
    const jobs = await claimDueEmailJobs({ limit: batchSize });

    if (jobs.length === 0) {
      break;
    }

    summary.claimed += jobs.length;

    for (const job of jobs) {
      const outcome = await processClaimedEmailJob(job);
      summary[outcome] += 1;
    }
  }

  summary.backlog.pending = await countEmailJobsByStatus("pending");
  summary.backlog.failed = await countEmailJobsByStatus("failed");

  return summary;
}

/**
 * Best-effort immediate delivery right after enqueueing, so the common case
 * does not wait for a worker poll. Never throws: on any error the job stays
 * in the queue and the retry/backoff machinery owns it from here. Returns the
 * job outcome, or null when the job could not be claimed or processed, so
 * callers can report delivery status truthfully instead of assuming success.
 */
export async function tryProcessEmailJobNow(jobId: string): Promise<EmailJobOutcome | null> {
  try {
    const job = await claimEmailJobById(jobId);

    if (!job) {
      return null;
    }

    return await processClaimedEmailJob(job);
  } catch (error) {
    console.error(`Immediate processing of email job ${jobId} failed; left for the worker.`, error);

    return null;
  }
}
