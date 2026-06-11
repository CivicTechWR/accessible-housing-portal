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
  claimNextDueEmailJob,
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
  claimNextDueEmailJob: jest.fn(),
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
const CLAIMED_AT = new Date("2026-06-11T12:00:00.000Z");

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
    claimedAt: CLAIMED_AT,
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

  // Outcome writes report whether the claim was still owned; default to yes.
  markEmailJobSentMock.mockResolvedValue(true);
  markEmailJobCanceledMock.mockResolvedValue(true);
  markEmailJobFailedMock.mockResolvedValue(true);
  scheduleEmailJobRetryMock.mockResolvedValue(true);
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
      claimedAt: CLAIMED_AT,
    });
    expect(scheduleEmailJobRetryMock).not.toHaveBeenCalled();
  });

  it("refuses to process a job that carries no claim", async () => {
    const job = makeJob({ claimedAt: null });

    await expect(processClaimedEmailJob(job)).rejects.toThrow("only claimed jobs can be processed");

    expect(accountInviteHandlerMock).not.toHaveBeenCalled();
  });

  it("warns instead of clobbering state when the claim was superseded", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const job = makeJob();
    accountInviteHandlerMock.mockResolvedValue({ providerMessageId: "email_123" });
    markEmailJobSentMock.mockResolvedValue(false);

    await expect(processClaimedEmailJob(job)).resolves.toBe("sent");

    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("was not recorded"));
    consoleWarnSpy.mockRestore();
  });

  it("schedules a bounded backoff retry on transient failure", async () => {
    const job = makeJob({ attempts: 2 });
    accountInviteHandlerMock.mockRejectedValue(new Error("Resend is unavailable"));

    const before = Date.now();

    await expect(processClaimedEmailJob(job)).resolves.toBe("retried");

    expect(scheduleEmailJobRetryMock).toHaveBeenCalledTimes(1);
    const retry = scheduleEmailJobRetryMock.mock.calls[0]?.[1];

    expect(retry?.error).toBe("Resend is unavailable");
    expect(retry?.claimedAt).toBe(CLAIMED_AT);
    // Attempt 2 backs off 60s ± 20% jitter.
    const delayMs = (retry?.runAfter.getTime() ?? 0) - before;
    expect(delayMs).toBeGreaterThanOrEqual(48_000);
    expect(delayMs).toBeLessThanOrEqual(73_000);
  });

  it("dead-letters the job as failed once attempts are exhausted", async () => {
    const job = makeJob({ attempts: 7, maxAttempts: 7 });
    accountInviteHandlerMock.mockRejectedValue(new Error("still failing"));

    await expect(processClaimedEmailJob(job)).resolves.toBe("failed");

    expect(markEmailJobFailedMock).toHaveBeenCalledWith(job.id, {
      error: "still failing",
      claimedAt: CLAIMED_AT,
    });
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
      claimedAt: CLAIMED_AT,
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
  it("claims and processes jobs one at a time until the queue is empty", async () => {
    const first = makeJob();
    const second = makeJob({ id: "5d3f0a52-7d92-4cf1-86fe-2f7f63726b02" });
    jest.mocked(failExhaustedEmailJobs).mockResolvedValue(1);
    jest
      .mocked(claimNextDueEmailJob)
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
      .mockResolvedValue(null);
    jest.mocked(countEmailJobsByStatus).mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    accountInviteHandlerMock.mockResolvedValue({ providerMessageId: "email_789" });

    const summary = await drainEmailJobs();

    // One claim per job: a hung send can only burn the attempt of the job it
    // is actually processing, never those of jobs claimed alongside it.
    expect(jest.mocked(claimNextDueEmailJob)).toHaveBeenCalledTimes(3);
    expect(summary).toEqual({
      claimed: 2,
      sent: 2,
      retried: 0,
      failed: 1,
      canceled: 0,
      backlog: { pending: 3, failed: 2 },
    });
  });

  it("stops claiming once the time budget is spent", async () => {
    jest.mocked(failExhaustedEmailJobs).mockResolvedValue(0);
    jest.mocked(countEmailJobsByStatus).mockResolvedValue(0);

    const summary = await drainEmailJobs({ timeBudgetMs: 0 });

    expect(jest.mocked(claimNextDueEmailJob)).not.toHaveBeenCalled();
    expect(summary.claimed).toBe(0);
  });
});

describe("tryProcessEmailJobNow", () => {
  it("processes the job when it can be claimed", async () => {
    const job = makeJob();
    claimEmailJobByIdMock.mockResolvedValue(job);
    accountInviteHandlerMock.mockResolvedValue({ providerMessageId: "email_456" });

    await expect(tryProcessEmailJobNow(job.id)).resolves.toBe("sent");

    expect(markEmailJobSentMock).toHaveBeenCalledWith(job.id, {
      providerMessageId: "email_456",
      claimedAt: CLAIMED_AT,
    });
  });

  it("reports the retried outcome when the provider call fails", async () => {
    const job = makeJob();
    claimEmailJobByIdMock.mockResolvedValue(job);
    accountInviteHandlerMock.mockRejectedValue(new Error("Resend is unavailable"));

    await expect(tryProcessEmailJobNow(job.id)).resolves.toBe("retried");
  });

  it("returns null at the deadline without cancelling the in-flight attempt", async () => {
    const job = makeJob();
    claimEmailJobByIdMock.mockResolvedValue(job);

    let finishSend: (result: { providerMessageId: string }) => void = () => {};
    accountInviteHandlerMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSend = resolve;
        }),
    );

    await expect(tryProcessEmailJobNow(job.id, { timeoutMs: 10 })).resolves.toBeNull();
    expect(markEmailJobSentMock).not.toHaveBeenCalled();

    // A late success (process kept alive) still records the send while this
    // attempt's claim is held; after a lease-expiry reclaim the write becomes
    // a no-op and the idempotency key keeps the email exactly-once.
    finishSend({ providerMessageId: "late_123" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(markEmailJobSentMock).toHaveBeenCalledWith(job.id, {
      providerMessageId: "late_123",
      claimedAt: CLAIMED_AT,
    });
  });

  it("returns null and leaves the job for the worker when it cannot be claimed", async () => {
    claimEmailJobByIdMock.mockResolvedValue(null);

    await expect(tryProcessEmailJobNow("missing-job")).resolves.toBeNull();

    expect(accountInviteHandlerMock).not.toHaveBeenCalled();
  });

  it("never throws when claiming fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    claimEmailJobByIdMock.mockRejectedValue(new Error("db unavailable"));

    await expect(tryProcessEmailJobNow("job-id")).resolves.toBeNull();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
