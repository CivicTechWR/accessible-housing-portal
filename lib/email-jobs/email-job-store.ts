import "server-only";

import { and, asc, count, eq, inArray, lt, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailJobs, type EmailJob, type EmailJobStatus, type NewEmailJob } from "@/db/schema";
import { PROCESSING_LEASE_MS } from "@/lib/email-jobs/email-job-policy";

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
  const leaseExpiredBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);

  return and(
    lt(emailJobs.attempts, emailJobs.maxAttempts),
    or(
      and(eq(emailJobs.status, "pending"), lte(emailJobs.runAfter, now)),
      and(eq(emailJobs.status, "processing"), lte(emailJobs.claimedAt, leaseExpiredBefore)),
    ),
  );
}

/**
 * Atomically claims due jobs for one worker. SELECT ... FOR UPDATE SKIP LOCKED
 * lets concurrent workers claim disjoint sets, and lease-expired processing
 * jobs from crashed workers become claimable again.
 */
export async function claimDueEmailJobs(params: { limit: number; now?: Date }) {
  const now = params.now ?? new Date();

  return db.transaction(async (tx): Promise<EmailJob[]> => {
    const due = await tx
      .select({ id: emailJobs.id })
      .from(emailJobs)
      .where(claimableEmailJobsFilter(now))
      .orderBy(asc(emailJobs.runAfter))
      .limit(params.limit)
      .for("update", { skipLocked: true });

    if (due.length === 0) {
      return [];
    }

    return tx
      .update(emailJobs)
      .set({
        status: "processing",
        claimedAt: now,
        attempts: sql`${emailJobs.attempts} + 1`,
        updatedAt: now,
      })
      .where(
        inArray(
          emailJobs.id,
          due.map((row) => row.id),
        ),
      )
      .returning();
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
  const leaseExpiredBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);

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
        lte(emailJobs.claimedAt, leaseExpiredBefore),
        sql`${emailJobs.attempts} >= ${emailJobs.maxAttempts}`,
      ),
    )
    .returning({ id: emailJobs.id });

  return failed.length;
}

export async function markEmailJobSent(
  jobId: string,
  params: { providerMessageId: string | null; sentAt?: Date },
) {
  const sentAt = params.sentAt ?? new Date();

  await db
    .update(emailJobs)
    .set({
      status: "sent",
      sentAt,
      providerMessageId: params.providerMessageId,
      secretContext: null,
      lastError: null,
      updatedAt: sentAt,
    })
    .where(eq(emailJobs.id, jobId));
}

export async function markEmailJobCanceled(jobId: string, params: { reason: string }) {
  await db
    .update(emailJobs)
    .set({
      status: "canceled",
      secretContext: null,
      lastError: params.reason,
      updatedAt: new Date(),
    })
    .where(and(eq(emailJobs.id, jobId), eq(emailJobs.status, "processing")));
}

export async function markEmailJobFailed(jobId: string, params: { error: string }) {
  await db
    .update(emailJobs)
    .set({
      status: "failed",
      secretContext: null,
      lastError: params.error,
      updatedAt: new Date(),
    })
    .where(and(eq(emailJobs.id, jobId), eq(emailJobs.status, "processing")));
}

export async function scheduleEmailJobRetry(
  jobId: string,
  params: { runAfter: Date; error: string },
) {
  await db
    .update(emailJobs)
    .set({
      status: "pending",
      runAfter: params.runAfter,
      claimedAt: null,
      lastError: params.error,
      updatedAt: new Date(),
    })
    .where(and(eq(emailJobs.id, jobId), eq(emailJobs.status, "processing")));
}

export async function countEmailJobsByStatus(status: EmailJobStatus) {
  const [row] = await db
    .select({ value: count() })
    .from(emailJobs)
    .where(eq(emailJobs.status, status));

  return row?.value ?? 0;
}
