import "server-only";

import { and, asc, count, eq, gt, lt, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailJobs, type EmailJob, type EmailJobStatus, type NewEmailJob } from "@/db/schema";
import { getProcessingClaimCutoffs } from "@/lib/email-jobs/email-job-policy";

type Database = typeof db;

/** The shared db client or a transaction, so enqueues can join an outbox transaction. */
export type EmailJobDbExecutor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function insertEmailJob(executor: EmailJobDbExecutor, values: NewEmailJob) {
  const [job] = await executor
    .insert(emailJobs)
    .values(values)
    .onConflictDoNothing({ target: emailJobs.idempotencyKey })
    .returning();

  return job ?? null;
}

export async function findEmailJobByIdempotencyKey(
  executor: EmailJobDbExecutor,
  idempotencyKey: string,
) {
  const [job] = await executor
    .select()
    .from(emailJobs)
    .where(eq(emailJobs.idempotencyKey, idempotencyKey))
    .limit(1);

  return job ?? null;
}

function claimableEmailJobsFilter(now: Date) {
  const { leaseExpiredAtOrBefore, staleAtOrBefore } = getProcessingClaimCutoffs(now);

  return and(
    lt(emailJobs.attempts, emailJobs.maxAttempts),
    or(
      and(eq(emailJobs.status, "pending"), lte(emailJobs.runAfter, now)),
      and(
        eq(emailJobs.status, "processing"),
        lte(emailJobs.claimedAt, leaseExpiredAtOrBefore),
        gt(emailJobs.claimedAt, staleAtOrBefore),
      ),
    ),
  );
}

/**
 * Atomically claims the single most overdue job. SELECT ... FOR UPDATE SKIP
 * LOCKED lets concurrent workers claim disjoint jobs, and lease-expired
 * processing jobs from crashed workers become claimable again.
 *
 * Deliberately claims one job at a time: claiming a batch would bump attempts
 * on jobs the worker never reaches if an earlier send hangs or the process is
 * killed, eventually dead-lettering emails that were never tried.
 */
export async function claimNextDueEmailJob(now = new Date()) {
  return db.transaction(async (tx): Promise<EmailJob | null> => {
    const [due] = await tx
      .select({ id: emailJobs.id })
      .from(emailJobs)
      .where(claimableEmailJobsFilter(now))
      .orderBy(asc(emailJobs.runAfter))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!due) {
      return null;
    }

    const [job] = await tx
      .update(emailJobs)
      .set({
        status: "processing",
        claimedAt: now,
        attempts: sql`${emailJobs.attempts} + 1`,
        updatedAt: now,
      })
      .where(eq(emailJobs.id, due.id))
      .returning();

    return job ?? null;
  });
}

export async function claimEmailJobById(jobId: string, now = new Date()) {
  return db.transaction(async (tx): Promise<EmailJob | null> => {
    const [due] = await tx
      .select({ id: emailJobs.id })
      .from(emailJobs)
      .where(and(eq(emailJobs.id, jobId), claimableEmailJobsFilter(now)))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!due) {
      return null;
    }

    const [job] = await tx
      .update(emailJobs)
      .set({
        status: "processing",
        claimedAt: now,
        attempts: sql`${emailJobs.attempts} + 1`,
        updatedAt: now,
      })
      .where(eq(emailJobs.id, due.id))
      .returning();

    return job ?? null;
  });
}

/**
 * Dead-letters processing jobs that exhausted their attempts and whose lease
 * expired (worker crashed on the final attempt), so they stay visible as
 * failed instead of being stuck in processing forever.
 */
export async function failExhaustedEmailJobs(now = new Date()) {
  const { leaseExpiredAtOrBefore } = getProcessingClaimCutoffs(now);

  const failed = await db
    .update(emailJobs)
    .set({
      status: "failed",
      secretContext: null,
      lastError: "Worker lease expired after the final attempt.",
      updatedAt: now,
    })
    .where(
      and(
        eq(emailJobs.status, "processing"),
        lte(emailJobs.claimedAt, leaseExpiredAtOrBefore),
        sql`${emailJobs.attempts} >= ${emailJobs.maxAttempts}`,
      ),
    )
    .returning({ id: emailJobs.id });

  return failed.length;
}

/**
 * Dead-letters abandoned claims before retrying them could fall outside the
 * provider's idempotency window and deliver the same logical email twice.
 */
export async function failStaleProcessingEmailJobs(now = new Date()) {
  const { staleAtOrBefore } = getProcessingClaimCutoffs(now);

  const failed = await db
    .update(emailJobs)
    .set({
      status: "failed",
      secretContext: null,
      lastError: "Worker claim exceeded the provider idempotency safety window; not retried.",
      updatedAt: now,
    })
    .where(and(eq(emailJobs.status, "processing"), lte(emailJobs.claimedAt, staleAtOrBefore)))
    .returning({ id: emailJobs.id });

  return failed.length;
}

/**
 * A claim is identified by the claimed_at timestamp the claiming transaction
 * wrote. Outcome writes must present it, so a writer whose claim was reclaimed
 * after its lease expired (e.g. a very late inline attempt) becomes a no-op
 * instead of clobbering the state of whichever worker now owns the job.
 * Returns whether the write landed.
 */
function ownsClaim(jobId: string, claimedAt: Date) {
  return and(
    eq(emailJobs.id, jobId),
    eq(emailJobs.status, "processing"),
    eq(emailJobs.claimedAt, claimedAt),
  );
}

export async function markEmailJobSent(
  jobId: string,
  params: { providerMessageId: string | null; claimedAt: Date; sentAt?: Date },
) {
  const sentAt = params.sentAt ?? new Date();

  const updated = await db
    .update(emailJobs)
    .set({
      status: "sent",
      sentAt,
      providerMessageId: params.providerMessageId,
      secretContext: null,
      lastError: null,
      updatedAt: sentAt,
    })
    .where(ownsClaim(jobId, params.claimedAt))
    .returning({ id: emailJobs.id });

  return updated.length > 0;
}

export async function markEmailJobCanceled(
  jobId: string,
  params: { reason: string; claimedAt: Date },
) {
  const updated = await db
    .update(emailJobs)
    .set({
      status: "canceled",
      secretContext: null,
      lastError: params.reason,
      updatedAt: new Date(),
    })
    .where(ownsClaim(jobId, params.claimedAt))
    .returning({ id: emailJobs.id });

  return updated.length > 0;
}

export async function markEmailJobFailed(
  jobId: string,
  params: { error: string; claimedAt: Date },
) {
  const updated = await db
    .update(emailJobs)
    .set({
      status: "failed",
      secretContext: null,
      lastError: params.error,
      updatedAt: new Date(),
    })
    .where(ownsClaim(jobId, params.claimedAt))
    .returning({ id: emailJobs.id });

  return updated.length > 0;
}

export async function scheduleEmailJobRetry(
  jobId: string,
  params: { runAfter: Date; error: string; claimedAt: Date },
) {
  const updated = await db
    .update(emailJobs)
    .set({
      status: "pending",
      runAfter: params.runAfter,
      claimedAt: null,
      lastError: params.error,
      updatedAt: new Date(),
    })
    .where(ownsClaim(jobId, params.claimedAt))
    .returning({ id: emailJobs.id });

  return updated.length > 0;
}

export async function countEmailJobsByStatus(status: EmailJobStatus) {
  const [row] = await db
    .select({ value: count() })
    .from(emailJobs)
    .where(eq(emailJobs.status, status));

  return row?.value ?? 0;
}
