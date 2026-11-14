/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PgBoss } from "pg-boss";

import { recordEmailDeliveryAttemptQueueJob } from "@/lib/email-delivery/store";
import { getEmailJobId, type EmailJobData } from "@/lib/email-queue/email-job";
import {
  EMAIL_DEAD_LETTER_QUEUE,
  EMAIL_QUEUE,
  enqueueEmail,
  RESEND_WEBHOOK_RETENTION_QUEUE,
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
    fromDrizzle: jest.fn(() => ({ kind: "drizzle-adapter" })),
  };
});

jest.mock("@/lib/email-delivery/store", () => ({
  recordEmailDeliveryAttemptQueueJob: jest.fn(),
}));

const PgBossMock = jest.mocked(PgBoss);
const recordQueueJobMock = jest.mocked(recordEmailDeliveryAttemptQueueJob);
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

// enqueueEmail only hands the transaction to the mocked store and pg-boss adapter.
const TX = {} as EmailEnqueueTransaction;

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
    const jobId = await enqueueEmail(TX, JOB_DATA);

    expect(jobId).toBe("9d2c63b4-13f7-46a5-8a3a-6dca59a87cf2");
    expect(bossInstance.send).toHaveBeenCalledWith(EMAIL_QUEUE, JOB_DATA, {
      db: expect.objectContaining({ kind: "drizzle-adapter" }),
      id: getEmailJobId(JOB_DATA),
      priority: 20,
    });
    const [recordedTx, recordedQueueJob] = recordQueueJobMock.mock.calls[0] ?? [];
    expect(recordedTx).toBe(TX);
    expect(recordedQueueJob).toEqual({
      attemptId: ATTEMPT.id,
      queueJobId: getEmailJobId(JOB_DATA),
    });
  });

  it("starts pg-boss once and provisions both queues without supervision when the worker is disabled", async () => {
    await enqueueEmail(TX, JOB_DATA);
    await enqueueEmail(TX, JOB_DATA);

    expect(PgBossMock).toHaveBeenCalledTimes(1);
    expect(PgBossMock).toHaveBeenCalledWith(expect.objectContaining({ supervise: false }));
    expect(PgBossMock).toHaveBeenCalledWith(expect.objectContaining({ schedule: false }));
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
    expect(bossInstance.createQueue).toHaveBeenCalledWith(
      RESEND_WEBHOOK_RETENTION_QUEUE,
      expect.objectContaining({ retryBackoff: true }),
    );
  });

  it("enables supervision where the worker runs", async () => {
    process.env.EMAIL_WORKER_ENABLED = "true";

    await enqueueEmail(TX, JOB_DATA);

    expect(PgBossMock).toHaveBeenCalledWith(expect.objectContaining({ supervise: true }));
    expect(PgBossMock).toHaveBeenCalledWith(expect.objectContaining({ schedule: true }));
  });
});
