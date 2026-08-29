/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fromDrizzle, PgBoss } from "pg-boss";

import { recordEmailDeliveryAttemptQueueJob } from "@/lib/email-delivery/store";
import { getEmailJobId, type EmailJobData } from "@/lib/email-queue/email-job";
import {
  EMAIL_DEAD_LETTER_QUEUE,
  EMAIL_QUEUE,
  enqueueEmail,
  type EmailEnqueueTransaction,
} from "@/lib/email-queue/queue";

jest.mock("pg-boss", () => {
  const instance = {
    on: jest.fn(),
    start: jest.fn(),
    createQueue: jest.fn(),
    updateQueue: jest.fn(),
    send: jest.fn(),
  };

  return {
    PgBoss: jest.fn(() => instance),
    fromDrizzle: jest.fn((txLike: unknown) => ({ kind: "drizzle-adapter", txLike })),
  };
});

jest.mock("@/lib/email-delivery/store", () => ({
  recordEmailDeliveryAttemptQueueJob: jest.fn(),
}));

const PgBossMock = jest.mocked(PgBoss);
const recordQueueJobMock = jest.mocked(recordEmailDeliveryAttemptQueueJob);
const fromDrizzleMock = jest.mocked(fromDrizzle);
const bossInstance = jest.mocked(new PgBossMock("ignored"));

const ORIGINAL_ENV = process.env;

const ATTEMPT = {
  id: "0f5cce0c-92e5-4ab0-a06d-21c5a8f4ff79",
  deliveryId: "6d5a1a9a-8f1f-4d1e-9a2e-3b0f5a2c7d11",
  emailType: "account_invite",
  attemptNumber: 1,
  idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204/attempt/1",
} as const;

const JOB_DATA: EmailJobData = {
  type: "account_invite",
  inviteId: "2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
  attempt: ATTEMPT,
  secret: "v1.sealed.invite.url",
};

function buildTx() {
  return {
    execute: jest.fn<(query: unknown) => Promise<unknown>>().mockResolvedValue(["row"]),
  };
}

function resetEmailQueueSingleton() {
  Reflect.deleteProperty(globalThis, "__ahpEmailQueue");
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/test",
  };
  delete process.env.EMAIL_WORKER_ENABLED;
  jest.clearAllMocks();
  resetEmailQueueSingleton();
  bossInstance.send.mockResolvedValue("9d2c63b4-13f7-46a5-8a3a-6dca59a87cf2");
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  resetEmailQueueSingleton();
});

describe("enqueueEmail", () => {
  it("sends the job with a deterministic id, its type's priority, and the transaction adapter", async () => {
    const tx = buildTx() as unknown as EmailEnqueueTransaction;

    const jobId = await enqueueEmail(tx, JOB_DATA);

    expect(jobId).toBe("9d2c63b4-13f7-46a5-8a3a-6dca59a87cf2");
    expect(bossInstance.send).toHaveBeenCalledWith(EMAIL_QUEUE, JOB_DATA, {
      db: expect.objectContaining({ kind: "drizzle-adapter" }),
      id: getEmailJobId(JOB_DATA),
      priority: 20,
    });
    const [recordedTx, recordedQueueJob] = recordQueueJobMock.mock.calls[0] ?? [];
    expect(recordedTx).toBe(tx);
    expect(recordedQueueJob).toEqual({
      attemptId: ATTEMPT.id,
      queueJobId: getEmailJobId(JOB_DATA),
    });
  });

  it("adapts drizzle's bare-array results to pg-boss's { rows } shape", async () => {
    const tx = buildTx();

    await enqueueEmail(tx as unknown as EmailEnqueueTransaction, JOB_DATA);

    const txLike = fromDrizzleMock.mock.calls[0]?.[0];
    await expect(txLike?.execute("select 1")).resolves.toEqual({ rows: ["row"] });
    expect(tx.execute).toHaveBeenCalledWith("select 1");
  });

  it("starts pg-boss once and provisions both queues without supervision when the worker is disabled", async () => {
    const tx = buildTx() as unknown as EmailEnqueueTransaction;

    await enqueueEmail(tx, JOB_DATA);
    await enqueueEmail(tx, JOB_DATA);

    expect(PgBossMock).toHaveBeenCalledTimes(1);
    expect(PgBossMock).toHaveBeenCalledWith(expect.objectContaining({ supervise: false }));
    expect(bossInstance.start).toHaveBeenCalledTimes(1);
    // The dead letter queue is worked too (failure recording), so it gets a
    // retry profile of its own — but no further dead-lettering.
    expect(bossInstance.createQueue).toHaveBeenCalledWith(
      EMAIL_DEAD_LETTER_QUEUE,
      expect.not.objectContaining({ deadLetter: expect.anything() }),
    );
    expect(bossInstance.createQueue).toHaveBeenCalledWith(
      EMAIL_DEAD_LETTER_QUEUE,
      expect.objectContaining({ retryBackoff: true }),
    );
    expect(bossInstance.createQueue).toHaveBeenCalledWith(
      EMAIL_QUEUE,
      expect.objectContaining({ deadLetter: EMAIL_DEAD_LETTER_QUEUE, retryBackoff: true }),
    );
  });

  it("enables supervision where the worker runs", async () => {
    process.env.EMAIL_WORKER_ENABLED = "true";

    await enqueueEmail(buildTx() as unknown as EmailEnqueueTransaction, JOB_DATA);

    expect(PgBossMock).toHaveBeenCalledWith(expect.objectContaining({ supervise: true }));
  });
});
