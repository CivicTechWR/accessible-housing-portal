import "server-only";

import { sql, type SQL } from "drizzle-orm";
import { fromDrizzle, PgBoss } from "pg-boss";

import { db } from "@/db";
import { EMAIL_JOB_PRIORITY, getEmailJobId, type EmailJobData } from "@/lib/email-queue/email-job";

export const EMAIL_QUEUE = "email_send";
export const EMAIL_DEAD_LETTER_QUEUE = "email_send_dead_letter";
/** pg-boss installs its job tables in this dedicated Postgres schema. */
export const EMAIL_QUEUE_SCHEMA = "pgboss";

/**
 * Transient failures retry with exponential backoff (~5s doubling, capped at
 * 15 minutes) for roughly an hour before the job moves to the dead letter
 * queue for operational follow-up. Quota deferrals do not consume retries;
 * the worker reschedules those explicitly via sendAfter.
 */
const EMAIL_QUEUE_OPTIONS = {
  retryLimit: 8,
  retryDelay: 5,
  retryBackoff: true,
  retryDelayMax: 900,
  // Keep expiration short so a job orphaned by a crash is retried within
  // a couple of minutes of restart instead of pg-boss's 15-minute default.
  expireInSeconds: 60,
  deadLetter: EMAIL_DEAD_LETTER_QUEUE,
} as const;

export function isEmailWorkerEnabled() {
  return process.env.EMAIL_WORKER_ENABLED === "true";
}

const globalForEmailQueue = globalThis as typeof globalThis & {
  __ahpEmailQueue?: Promise<PgBoss>;
};

/**
 * Lazily started process-wide pg-boss singleton. globalThis-cached so dev hot
 * reload and the separately bundled instrumentation entry point share one
 * instance (and one connection pool) instead of starting duplicate pollers.
 */
export function getEmailQueue(): Promise<PgBoss> {
  globalForEmailQueue.__ahpEmailQueue ??= createEmailQueue().catch((error) => {
    // Do not cache a failed startup, or every enqueue after a transient
    // database outage would keep failing until the process restarts.
    globalForEmailQueue.__ahpEmailQueue = undefined;
    throw error;
  });

  return globalForEmailQueue.__ahpEmailQueue;
}

async function createEmailQueue() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment before using the database.",
    );
  }

  const boss = new PgBoss({
    connectionString: databaseUrl,
    max: 2,
    // Maintenance (retention, expiration recovery) only needs to run where
    // jobs are worked; enqueue-only processes skip it.
    supervise: isEmailWorkerEnabled(),
    schedule: false,
  });

  boss.on("error", (error) => {
    console.error("[email-queue] pg-boss error:", error);
  });

  await boss.start();
  await boss.createQueue(EMAIL_DEAD_LETTER_QUEUE);
  await boss.createQueue(EMAIL_QUEUE, EMAIL_QUEUE_OPTIONS);
  // createQueue is a no-op for existing queues, so apply option changes too.
  await boss.updateQueue(EMAIL_QUEUE, EMAIL_QUEUE_OPTIONS);

  return boss;
}

export type EmailEnqueueTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Enqueue a durable email job inside the same transaction that writes the
 * business records, so a committed record can never lose its email.
 *
 * Successful enqueue means the email is queued, not sent. Returns the job id,
 * or null when the same logical email is already enqueued (deterministic-id
 * dedupe).
 */
export async function enqueueEmail(
  tx: EmailEnqueueTransaction,
  data: EmailJobData,
): Promise<string | null> {
  const boss = await getEmailQueue();

  return await boss.send(EMAIL_QUEUE, data, {
    db: fromDrizzle(
      {
        // drizzle's postgres-js driver returns rows as a bare array, while
        // pg-boss's adapter expects a node-postgres style { rows } result.
        execute: async (query) => ({ rows: await tx.execute(query as SQL) }),
      },
      sql,
    ),
    id: getEmailJobId(data),
    priority: EMAIL_JOB_PRIORITY[data.type],
  });
}
