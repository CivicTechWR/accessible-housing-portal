import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { EmailJob } from "@/db/schema";
import { EmailJobCanceledError } from "@/lib/email-jobs/errors";
import {
  claimEmailJobById,
  findEmailJobByIdempotencyKey,
  insertEmailJob,
  markEmailJobCanceled,
  markEmailJobFailed,
  markEmailJobSent,
  scheduleEmailJobRetry,
} from "@/lib/email-jobs/email-job-store";
import { emailJobHandlers } from "@/lib/email-jobs/handlers";
import {
  claimDueEmailJobs,
  countEmailJobsByStatus,
  failExhaustedEmailJobs,
} from "@/lib/email-jobs/email-job-store";
import {
  drainEmailJobs,
  enqueueEmailJob,
  processClaimedEmailJob,
  tryProcessEmailJobNow,
} from "@/lib/email-jobs/email-job-service";
import { decryptSecretContext } from "@/lib/email-jobs/secret-context";

jest.mock("@/db", () => ({ db: {} }));

jest.mock("@/lib/email-jobs/email-job-store", () => ({
  insertEmailJob: jest.fn(),
  findEmailJobByIdempotencyKey: jest.fn(),
  claimDueEmailJobs: jest.fn(),
  claimEmailJobById: jest.fn(),
  countEmailJobsByStatus: jest.fn(),
  failExhaustedEmailJobs: jest.fn(),
  markEmailJobSent: jest.fn(),
  markEmailJobCanceled: jest.fn(),
  markEmailJobFailed: jest.fn(),
  scheduleEmailJobRetry: jest.fn(),
}));

jest.mock("@/lib/email-jobs/handlers", () => ({
  emailJobHandlers: {
    account_invite: jest.fn(),
  },
}));

const insertEmailJobMock = jest.mocked(insertEmailJob);
const findEmailJobByIdempotencyKeyMock = jest.mocked(findEmailJobByIdempotencyKey);
const claimEmailJobByIdMock = jest.mocked(claimEmailJobById);
const markEmailJobSentMock = jest.mocked(markEmailJobSent);
const markEmailJobCanceledMock = jest.mocked(markEmailJobCanceled);
const markEmailJobFailedMock = jest.mocked(markEmailJobFailed);
const scheduleEmailJobRetryMock = jest.mocked(scheduleEmailJobRetry);
const accountInviteHandlerMock = jest.mocked(emailJobHandlers.account_invite);

const INVITE_ID = "2e42f745-44e8-4ab7-a2a2-c1f42cc8e204";
const INVITE_URL = "https://housing.example.org/invite?token=raw-secret-token";

function makeJob(overrides: Partial<EmailJob> = {}): EmailJob {
  return {
    id: "9f5be1de-8b29-44a9-9c25-3a3f6d2e3a01",
    type: "account_invite",
    status: "processing",
    idempotencyKey: `account_invite/${INVITE_ID}`,
    payload: { inviteId: INVITE_ID },
    secretContext: Buffer.from("encrypted"),
    recipientEmail: "tenant@example.org",
    attempts: 1,
    maxAttempts: 7,
    runAfter: new Date(),
    claimedAt: new Date(),
    sentAt: null,
    providerMessageId: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EMAIL_JOB_SECRET_KEY = Buffer.alloc(32, 9).toString("base64");
});

afterAll(() => {
  delete process.env.EMAIL_JOB_SECRET_KEY;
});

describe("enqueueEmailJob", () => {
  it("persists entity references in the payload and only encrypted secret context", async () => {
    insertEmailJobMock.mockResolvedValue(makeJob({ status: "pending" }));

    const result = await enqueueEmailJob({
      type: "account_invite",
      payload: { inviteId: INVITE_ID },
      secretContext: { inviteUrl: INVITE_URL },
      idempotencyKey: `account_invite/${INVITE_ID}`,
      recipientEmail: "tenant@example.org",
    });

    expect(result.created).toBe(true);
    expect(insertEmailJobMock).toHaveBeenCalledTimes(1);

    const inserted = insertEmailJobMock.mock.calls[0]?.[1];

    expect(inserted).toMatchObject({
      type: "account_invite",
      payload: { inviteId: INVITE_ID },
      idempotencyKey: `account_invite/${INVITE_ID}`,
      recipientEmail: "tenant@example.org",
      maxAttempts: 7,
    });

    // The raw invite token must never be persisted as plaintext.
    expect(JSON.stringify(inserted?.payload)).not.toContain("raw-secret-token");
    expect(Buffer.isBuffer(inserted?.secretContext)).toBe(true);
    expect(inserted?.secretContext?.toString("latin1")).not.toContain("raw-secret-token");

    // But the worker can decrypt the invite URL back at send time.
    expect(decryptSecretContext<{ inviteUrl: string }>(inserted?.secretContext as Buffer)).toEqual({
      inviteUrl: INVITE_URL,
    });
  });

  it("reuses the existing job when the idempotency key was already enqueued", async () => {
    const existing = makeJob({ status: "pending" });
    insertEmailJobMock.mockResolvedValue(null);
    findEmailJobByIdempotencyKeyMock.mockResolvedValue(existing);

    const result = await enqueueEmailJob({
      type: "account_invite",
      payload: { inviteId: INVITE_ID },
      secretContext: { inviteUrl: INVITE_URL },
      idempotencyKey: `account_invite/${INVITE_ID}`,
      recipientEmail: "tenant@example.org",
    });

    expect(result).toEqual({ job: existing, created: false });
  });
});

describe("processClaimedEmailJob", () => {
  it("marks the job sent with the provider message id on success", async () => {
    const job = makeJob();
    accountInviteHandlerMock.mockResolvedValue({ providerMessageId: "email_123" });

    await expect(processClaimedEmailJob(job)).resolves.toBe("sent");

    expect(markEmailJobSentMock).toHaveBeenCalledWith(job.id, {
      providerMessageId: "email_123",
    });
    expect(scheduleEmailJobRetryMock).not.toHaveBeenCalled();
  });

  it("schedules a bounded backoff retry on transient failure", async () => {
    const job = makeJob({ attempts: 2 });
    accountInviteHandlerMock.mockRejectedValue(new Error("Resend is unavailable"));

    const before = Date.now();

    await expect(processClaimedEmailJob(job)).resolves.toBe("retried");

    expect(scheduleEmailJobRetryMock).toHaveBeenCalledTimes(1);
    const retry = scheduleEmailJobRetryMock.mock.calls[0]?.[1];

    expect(retry?.error).toBe("Resend is unavailable");
    // Attempt 2 backs off 60s ± 20% jitter.
    const delayMs = (retry?.runAfter.getTime() ?? 0) - before;
    expect(delayMs).toBeGreaterThanOrEqual(48_000);
    expect(delayMs).toBeLessThanOrEqual(73_000);
  });

  it("dead-letters the job as failed once attempts are exhausted", async () => {
    const job = makeJob({ attempts: 7, maxAttempts: 7 });
    accountInviteHandlerMock.mockRejectedValue(new Error("still failing"));

    await expect(processClaimedEmailJob(job)).resolves.toBe("failed");

    expect(markEmailJobFailedMock).toHaveBeenCalledWith(job.id, { error: "still failing" });
    expect(scheduleEmailJobRetryMock).not.toHaveBeenCalled();
  });

  it("cancels without retrying when the handler reports the email is obsolete", async () => {
    const job = makeJob();
    accountInviteHandlerMock.mockRejectedValue(
      new EmailJobCanceledError("Invite was already accepted."),
    );

    await expect(processClaimedEmailJob(job)).resolves.toBe("canceled");

    expect(markEmailJobCanceledMock).toHaveBeenCalledWith(job.id, {
      reason: "Invite was already accepted.",
    });
    expect(scheduleEmailJobRetryMock).not.toHaveBeenCalled();
    expect(markEmailJobFailedMock).not.toHaveBeenCalled();
  });

  it("redacts tokens from persisted error context", async () => {
    const job = makeJob();
    accountInviteHandlerMock.mockRejectedValue(new Error(`Invalid URL: ${INVITE_URL}`));

    await processClaimedEmailJob(job);

    const retry = scheduleEmailJobRetryMock.mock.calls[0]?.[1];
    expect(retry?.error).not.toContain("raw-secret-token");
    expect(retry?.error).toContain("token=[redacted]");
  });
});

describe("drainEmailJobs", () => {
  it("processes claimed batches until the queue is empty and reports the backlog", async () => {
    const jobs = [makeJob(), makeJob({ id: "5d3f0a52-7d92-4cf1-86fe-2f7f63726b02" })];
    jest.mocked(failExhaustedEmailJobs).mockResolvedValue(1);
    jest.mocked(claimDueEmailJobs).mockResolvedValueOnce(jobs).mockResolvedValue([]);
    jest.mocked(countEmailJobsByStatus).mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    accountInviteHandlerMock.mockResolvedValue({ providerMessageId: "email_789" });

    const summary = await drainEmailJobs({ batchSize: 10 });

    expect(summary).toEqual({
      claimed: 2,
      sent: 2,
      retried: 0,
      failed: 1,
      canceled: 0,
      backlog: { pending: 3, failed: 2 },
    });
  });
});

describe("tryProcessEmailJobNow", () => {
  it("processes the job when it can be claimed", async () => {
    const job = makeJob();
    claimEmailJobByIdMock.mockResolvedValue(job);
    accountInviteHandlerMock.mockResolvedValue({ providerMessageId: "email_456" });

    await tryProcessEmailJobNow(job.id);

    expect(markEmailJobSentMock).toHaveBeenCalledWith(job.id, {
      providerMessageId: "email_456",
    });
  });

  it("leaves the job for the worker when it cannot be claimed", async () => {
    claimEmailJobByIdMock.mockResolvedValue(null);

    await tryProcessEmailJobNow("missing-job");

    expect(accountInviteHandlerMock).not.toHaveBeenCalled();
  });

  it("never throws when claiming fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    claimEmailJobByIdMock.mockRejectedValue(new Error("db unavailable"));

    await expect(tryProcessEmailJobNow("job-id")).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
