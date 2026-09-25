/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { sendInviteEmail } from "@/lib/auth/invite-email";
import {
  findInviteEmailJobTarget,
  markInviteEmailFailed,
  markInviteEmailSubmitted,
} from "@/lib/auth/invite-store";
import { EmailSendError } from "@/lib/email";
import { buildAccountInviteEmailJob, type EmailJobData } from "@/lib/email-queue/email-job";
import { EMAIL_DEAD_LETTER_QUEUE, EMAIL_QUEUE } from "@/lib/email-queue/queue";
import {
  MAX_EMAIL_JOB_DEFERRALS,
  processDeadLetteredEmailJob,
  processEmailJob,
  type EmailWorkerBoss,
} from "@/lib/email-queue/worker";

import type { Job } from "pg-boss";
import type { ErrorResponse } from "resend";

jest.mock("pg-boss", () => ({
  PgBoss: jest.fn(),
  fromDrizzle: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({ auth: {} }));

jest.mock("@/lib/auth/invite-email", () => ({
  sendInviteEmail: jest.fn(),
}));

jest.mock("@/lib/auth/invite-store", () => ({
  findInviteEmailJobTarget: jest.fn(),
  markInviteEmailFailed: jest.fn(),
  markInviteEmailSubmitted: jest.fn(),
}));

const sendInviteEmailMock = jest.mocked(sendInviteEmail);
const findInviteEmailJobTargetMock = jest.mocked(findInviteEmailJobTarget);
const markInviteEmailFailedMock = jest.mocked(markInviteEmailFailed);
const markInviteEmailSubmittedMock = jest.mocked(markInviteEmailSubmitted);

const ORIGINAL_ENV = process.env;
const INVITE_ID = "2e42f745-44e8-4ab7-a2a2-c1f42cc8e204";
const INVITE_URL = "https://housing.example.org/invite?token=raw-one-time-token";
const ATTEMPT = {
  id: "0f5cce0c-92e5-4ab0-a06d-21c5a8f4ff79",
  deliveryId: "6d5a1a9a-8f1f-4d1e-9a2e-3b0f5a2c7d11",
  emailType: "account_invite",
  attemptNumber: 1,
  idempotencyKey: `account_invite/${INVITE_ID}/attempt/1`,
} as const;

const executeSqlMock = jest.fn<(text: string, values?: unknown[]) => Promise<{ rows: never[] }>>();
const sendAfterMock =
  jest.fn<
    (
      name: string,
      data: object | null,
      options: object | null,
      after: number,
    ) => Promise<string | null>
  >();
const boss = {
  sendAfter: sendAfterMock,
  getDb: () => ({ executeSql: executeSqlMock }),
} as unknown as EmailWorkerBoss;

function buildJob(signal: AbortSignal = new AbortController().signal): Job<EmailJobData> {
  return {
    id: "5a2da32a-cc55-4b27-bcb6-7e0bbf0db5c6",
    name: EMAIL_QUEUE,
    data: buildAccountInviteEmailJob({
      inviteId: INVITE_ID,
      inviteUrl: INVITE_URL,
      attempt: ATTEMPT,
    }),
    signal,
  } as Job<EmailJobData>;
}

function expectedRedactionParams(job: Job<EmailJobData>) {
  return [
    EMAIL_QUEUE,
    EMAIL_DEAD_LETTER_QUEUE,
    JSON.stringify({ type: "account_invite", inviteId: INVITE_ID }),
    job.id,
  ];
}

function buildInviteTarget() {
  return {
    email: "tenant@example.org",
    fullName: "Tenant User",
    userStatus: "invited" as const,
    expiresAt: new Date(Date.now() + 60_000),
    acceptedAt: null,
    sentAt: null,
  };
}

function providerError(code: ErrorResponse["name"], retryAfterSeconds: number | null = null) {
  const statusCode = code === "internal_server_error" ? 500 : 429;
  return new EmailSendError(code, { code, statusCode, retryAfterSeconds });
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    EMAIL_JOB_SECRET: "test-auth-secret",
  };
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  executeSqlMock.mockResolvedValue({ rows: [] });
  sendAfterMock.mockResolvedValue("b3398ac1-43cf-4e54-92ee-9f7e2a4e7f6a");
  findInviteEmailJobTargetMock.mockResolvedValue(buildInviteTarget());
  sendInviteEmailMock.mockResolvedValue({ id: "email_123" });
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("processEmailJob", () => {
  it("submits the invite email with the unsealed URL, records acceptance, and redacts the secret", async () => {
    const job = buildJob();

    const result = await processEmailJob(boss, job);

    expect(sendInviteEmailMock).toHaveBeenCalledWith({
      email: "tenant@example.org",
      fullName: "Tenant User",
      inviteUrl: INVITE_URL,
      attempt: ATTEMPT,
      signal: job.signal,
    });
    expect(markInviteEmailSubmittedMock).toHaveBeenCalledWith(INVITE_ID);
    expect(result).toEqual({ status: "submitted", providerMessageId: "email_123" });
    expect(executeSqlMock).toHaveBeenCalledWith(
      expect.stringContaining("data - 'secret'"),
      expectedRedactionParams(job),
    );
  });

  it.each([
    { target: null, reason: "invite_not_found" },
    { target: { ...buildInviteTarget(), acceptedAt: new Date() }, reason: "invite_accepted" },
    {
      target: { ...buildInviteTarget(), expiresAt: new Date(Date.now() - 1) },
      reason: "invite_expired",
    },
  ])("skips sending and still redacts the secret: $reason", async ({ target, reason }) => {
    findInviteEmailJobTargetMock.mockResolvedValue(target);
    const job = buildJob();

    const result = await processEmailJob(boss, job);

    expect(sendInviteEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason });
    expect(executeSqlMock).toHaveBeenCalledWith(
      expect.stringContaining("data - 'secret'"),
      expectedRedactionParams(job),
    );
  });

  it("skips sending when the invite email was already submitted, even without a payload secret", async () => {
    findInviteEmailJobTargetMock.mockResolvedValue({
      ...buildInviteTarget(),
      sentAt: new Date(),
    });
    const job = buildJob();
    (job.data as { secret?: string }).secret = undefined;

    const result = await processEmailJob(boss, job);

    expect(sendInviteEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "invite_already_submitted" });
  });

  it("fails into the retry/dead-letter cycle when an unsubmitted invite has no payload secret", async () => {
    const job = buildJob();
    (job.data as { secret?: string }).secret = undefined;

    await expect(processEmailJob(boss, job)).rejects.toThrow("no sealed payload secret");

    expect(sendInviteEmailMock).not.toHaveBeenCalled();
  });

  it("stops before mutating state when the job expires during the send", async () => {
    const abortController = new AbortController();
    sendInviteEmailMock.mockImplementationOnce(async () => {
      abortController.abort();
      return { id: "email_123" };
    });

    await expect(processEmailJob(boss, buildJob(abortController.signal))).rejects.toThrow(
      "expired during send",
    );

    expect(markInviteEmailSubmittedMock).not.toHaveBeenCalled();
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("does not defer quota failures for a job that expired during the send", async () => {
    const abortController = new AbortController();
    sendInviteEmailMock.mockImplementationOnce(async () => {
      abortController.abort();
      throw providerError("rate_limit_exceeded", 7);
    });

    await expect(processEmailJob(boss, buildJob(abortController.signal))).rejects.toThrow(
      "rate_limit_exceeded",
    );

    expect(sendAfterMock).not.toHaveBeenCalled();
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("defers by the provider's Retry-After when rate limited", async () => {
    const job = buildJob();
    sendInviteEmailMock.mockRejectedValue(providerError("rate_limit_exceeded", 7));

    const result = await processEmailJob(boss, job);

    expect(sendAfterMock).toHaveBeenCalledWith(
      EMAIL_QUEUE,
      { ...job.data, deferralCount: 1 },
      { priority: 20 },
      7,
    );
    expect(markInviteEmailSubmittedMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "deferred",
      reason: "rate_limit_exceeded",
      deferredForSeconds: 7,
      replacementJobId: "b3398ac1-43cf-4e54-92ee-9f7e2a4e7f6a",
    });
    // The deferred original keeps its sealed secret: a crash-recovered retry
    // must still be able to send or defer. The chain-wide redaction sweeps
    // this row once the replacement reaches a terminal outcome.
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("defers briefly when rate limited without a Retry-After header", async () => {
    sendInviteEmailMock.mockRejectedValue(providerError("rate_limit_exceeded"));

    const result = await processEmailJob(boss, buildJob());

    expect(result).toMatchObject({ status: "deferred", deferredForSeconds: 2 });
  });

  it("defers ~24 hours when the daily quota is exhausted", async () => {
    const job = buildJob();
    sendInviteEmailMock.mockRejectedValue(providerError("daily_quota_exceeded"));

    const result = await processEmailJob(boss, job);

    expect(sendAfterMock).toHaveBeenCalledWith(
      EMAIL_QUEUE,
      { ...job.data, deferralCount: 1 },
      { priority: 20 },
      86_400,
    );
    expect(result).toMatchObject({ status: "deferred", reason: "daily_quota_exceeded" });
  });

  it("increments the deferral count across successive deferrals", async () => {
    const job = buildJob();
    job.data.deferralCount = 3;
    sendInviteEmailMock.mockRejectedValue(providerError("rate_limit_exceeded", 7));

    const result = await processEmailJob(boss, job);

    expect(sendAfterMock).toHaveBeenCalledWith(
      EMAIL_QUEUE,
      { ...job.data, deferralCount: 4 },
      { priority: 20 },
      7,
    );
    expect(result).toMatchObject({ status: "deferred" });
  });

  it("fails into the retry/dead-letter cycle once the deferral chain hits the cap", async () => {
    const job = buildJob();
    job.data.deferralCount = MAX_EMAIL_JOB_DEFERRALS;
    sendInviteEmailMock.mockRejectedValue(providerError("rate_limit_exceeded", 7));

    await expect(processEmailJob(boss, job)).rejects.toThrow("rate_limit_exceeded");

    expect(sendAfterMock).not.toHaveBeenCalled();
    // The secret stays in place for the retries pg-boss now owns.
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("fails into the retry/dead-letter cycle when the monthly quota is exhausted", async () => {
    sendInviteEmailMock.mockRejectedValue(providerError("monthly_quota_exceeded"));

    await expect(processEmailJob(boss, buildJob())).rejects.toThrow("monthly_quota_exceeded");

    expect(sendAfterMock).not.toHaveBeenCalled();
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("rethrows transient provider failures so pg-boss retries with backoff", async () => {
    sendInviteEmailMock.mockRejectedValue(providerError("internal_server_error"));

    await expect(processEmailJob(boss, buildJob())).rejects.toThrow("internal_server_error");

    expect(sendAfterMock).not.toHaveBeenCalled();
  });
});

describe("processDeadLetteredEmailJob", () => {
  function buildDeadLetterJob(signal?: AbortSignal): Job<EmailJobData> {
    return { ...buildJob(signal), name: EMAIL_DEAD_LETTER_QUEUE };
  }

  it("records the permanent failure on the invite and redacts the secret across both queues", async () => {
    const job = buildDeadLetterJob();

    const result = await processDeadLetteredEmailJob(boss, job);

    expect(markInviteEmailFailedMock).toHaveBeenCalledWith(INVITE_ID);
    // The match spans EMAIL_QUEUE too, so the failed source row and any
    // deferral ancestors are redacted along with the dead-lettered copy.
    expect(executeSqlMock).toHaveBeenCalledWith(
      expect.stringContaining("data - 'secret'"),
      expectedRedactionParams(job),
    );
    expect(result).toEqual({ status: "failure_recorded" });
  });

  it("still records the failure but leaves the payload alone when the job expires mid-handler", async () => {
    const abortController = new AbortController();
    markInviteEmailFailedMock.mockImplementationOnce(async () => abortController.abort());

    const result = await processDeadLetteredEmailJob(
      boss,
      buildDeadLetterJob(abortController.signal),
    );

    expect(markInviteEmailFailedMock).toHaveBeenCalledWith(INVITE_ID);
    expect(executeSqlMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "failure_recorded" });
  });
});
