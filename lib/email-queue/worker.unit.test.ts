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
import { sendPasswordResetEmail } from "@/lib/auth/password-reset-email";
import {
  findPasswordResetEmailJobTarget,
  markPasswordResetEmailFailed,
  markPasswordResetEmailSubmitted,
} from "@/lib/auth/password-reset-service";
import { EmailSendError } from "@/lib/email";
import {
  buildAccountInviteEmailJob,
  buildPasswordResetEmailJob,
  type EmailJobData,
} from "@/lib/email-queue/email-job";
import { EMAIL_DEAD_LETTER_QUEUE, EMAIL_QUEUE } from "@/lib/email-queue/queue";
import {
  MAX_EMAIL_JOB_DEFERRALS,
  processDeadLetteredEmailJob,
  processEmailJob,
  type EmailWorkerBoss,
} from "@/lib/email-queue/worker";

import type { Job } from "pg-boss";

jest.mock("pg-boss", () => ({
  PgBoss: jest.fn(),
  fromDrizzle: jest.fn(),
}));

jest.mock("@/lib/auth/invite-email", () => ({
  getAccountInviteEmailIdempotencyKey: (inviteId: string) => `account_invite/${inviteId}`,
  sendInviteEmail: jest.fn(),
}));

jest.mock("@/lib/auth/invite-store", () => ({
  findInviteEmailJobTarget: jest.fn(),
  markInviteEmailFailed: jest.fn(),
  markInviteEmailSubmitted: jest.fn(),
}));

jest.mock("@/lib/auth/password-reset-email", () => ({
  getPasswordResetEmailIdempotencyKey: (tokenId: string) => `password_reset/${tokenId}`,
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("@/lib/auth/password-reset-service", () => ({
  findPasswordResetEmailJobTarget: jest.fn(),
  markPasswordResetEmailFailed: jest.fn(),
  markPasswordResetEmailSubmitted: jest.fn(),
}));

const sendInviteEmailMock = jest.mocked(sendInviteEmail);
const findInviteEmailJobTargetMock = jest.mocked(findInviteEmailJobTarget);
const markInviteEmailFailedMock = jest.mocked(markInviteEmailFailed);
const markInviteEmailSubmittedMock = jest.mocked(markInviteEmailSubmitted);

const sendPasswordResetEmailMock = jest.mocked(sendPasswordResetEmail);
const findPasswordResetEmailJobTargetMock = jest.mocked(findPasswordResetEmailJobTarget);
const markPasswordResetEmailFailedMock = jest.mocked(markPasswordResetEmailFailed);
const markPasswordResetEmailSubmittedMock = jest.mocked(markPasswordResetEmailSubmitted);

const ORIGINAL_ENV = process.env;
const INVITE_ID = "2e42f745-44e8-4ab7-a2a2-c1f42cc8e204";
const INVITE_URL = "https://housing.example.org/invite?token=raw-one-time-token";
const RESET_ROW_ID = "8c3f0a52-9b1d-4e6f-a7c2-d4b8e1f0a399";
const RESET_URL = "https://housing.example.org/reset-password?oneTimeLink=raw-one-time-reset-link";

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
    data: buildAccountInviteEmailJob({ inviteId: INVITE_ID, inviteUrl: INVITE_URL }),
    signal,
  } as Job<EmailJobData>;
}

function buildAbortedJob(): Job<EmailJobData> {
  const abortController = new AbortController();
  abortController.abort();
  return buildJob(abortController.signal);
}

function buildPasswordResetJob(
  signal: AbortSignal = new AbortController().signal,
): Job<EmailJobData> {
  return {
    id: "6b3eb43b-dd66-4c38-bcb7-8f1e2a5b4c77",
    name: EMAIL_QUEUE,
    data: buildPasswordResetEmailJob({ tokenId: RESET_ROW_ID, resetUrl: RESET_URL }),
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
    expiresAt: new Date(Date.now() + 60_000),
    acceptedAt: null,
    sentAt: null,
  };
}

function buildResetTarget() {
  return {
    email: "tenant@example.org",
    fullName: "Tenant User",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    sentAt: null,
  };
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    AUTH_SECRET: "test-auth-secret",
  };
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  executeSqlMock.mockResolvedValue({ rows: [] });
  sendAfterMock.mockResolvedValue("b3398ac1-43cf-4e54-92ee-9f7e2a4e7f6a");
  findInviteEmailJobTargetMock.mockResolvedValue(buildInviteTarget());
  sendInviteEmailMock.mockResolvedValue({ id: "email_123" });
  findPasswordResetEmailJobTargetMock.mockResolvedValue(buildResetTarget());
  sendPasswordResetEmailMock.mockResolvedValue({ id: "email_456" });
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe("processEmailJob", () => {
  it("submits the invite email with the unsealed URL and records provider acceptance", async () => {
    const job = buildJob();

    const result = await processEmailJob(boss, job);

    expect(sendInviteEmailMock).toHaveBeenCalledWith({
      email: "tenant@example.org",
      fullName: "Tenant User",
      inviteUrl: INVITE_URL,
      idempotencyKey: `account_invite/${INVITE_ID}`,
      signal: job.signal,
    });
    expect(markInviteEmailSubmittedMock).toHaveBeenCalledWith(INVITE_ID);
    expect(result).toEqual({ status: "submitted", providerMessageId: "email_123" });
  });

  it("redacts the sealed secret from every settled row of the logical email once the job completes", async () => {
    const job = buildJob();

    await processEmailJob(boss, job);

    expect(executeSqlMock).toHaveBeenCalledWith(
      expect.stringContaining("data - 'secret'"),
      expectedRedactionParams(job),
    );
    // Deferral ancestors and dead-letter copies settle as completed/failed and
    // are swept by the logical-email match; rows a live attempt may still need
    // (created, retry) are excluded by the state filter.
    const [statement] = executeSqlMock.mock.calls[0] as [string];
    expect(statement).toContain("data @> $3::jsonb");
    expect(statement).toContain("(id = $4 OR state IN ('completed', 'failed', 'cancelled'))");
  });

  it("skips sending when the invite no longer exists and still redacts the secret", async () => {
    findInviteEmailJobTargetMock.mockResolvedValue(null);
    const job = buildJob();

    const result = await processEmailJob(boss, job);

    expect(sendInviteEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "invite_not_found" });
    expect(executeSqlMock).toHaveBeenCalledWith(
      expect.stringContaining("data - 'secret'"),
      expectedRedactionParams(job),
    );
  });

  it("skips sending when the invite was already accepted", async () => {
    findInviteEmailJobTargetMock.mockResolvedValue({
      ...buildInviteTarget(),
      acceptedAt: new Date(),
    });

    const result = await processEmailJob(boss, buildJob());

    expect(sendInviteEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "invite_accepted" });
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

  it("stops before mutating state when the job expired during the send", async () => {
    const job = buildAbortedJob();

    await expect(processEmailJob(boss, job)).rejects.toThrow("expired during send");

    expect(markInviteEmailSubmittedMock).not.toHaveBeenCalled();
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("does not defer quota failures for an expired job pg-boss already retries", async () => {
    sendInviteEmailMock.mockRejectedValue(
      new EmailSendError("Too many requests", {
        code: "rate_limit_exceeded",
        statusCode: 429,
        retryAfterSeconds: 7,
      }),
    );

    await expect(processEmailJob(boss, buildAbortedJob())).rejects.toThrow("Too many requests");

    expect(sendAfterMock).not.toHaveBeenCalled();
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("skips sending when the invite expired or was superseded", async () => {
    findInviteEmailJobTargetMock.mockResolvedValue({
      ...buildInviteTarget(),
      expiresAt: new Date(Date.now() - 1),
    });

    const result = await processEmailJob(boss, buildJob());

    expect(sendInviteEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "invite_expired" });
  });

  it("defers by the provider's Retry-After when rate limited", async () => {
    const job = buildJob();
    sendInviteEmailMock.mockRejectedValue(
      new EmailSendError("Too many requests", {
        code: "rate_limit_exceeded",
        statusCode: 429,
        retryAfterSeconds: 7,
      }),
    );

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
    sendInviteEmailMock.mockRejectedValue(
      new EmailSendError("Too many requests", {
        code: "rate_limit_exceeded",
        statusCode: 429,
        retryAfterSeconds: null,
      }),
    );

    const result = await processEmailJob(boss, buildJob());

    expect(result).toMatchObject({ status: "deferred", deferredForSeconds: 2 });
  });

  it("defers ~24 hours when the daily quota is exhausted", async () => {
    const job = buildJob();
    sendInviteEmailMock.mockRejectedValue(
      new EmailSendError("Daily quota exceeded", {
        code: "daily_quota_exceeded",
        statusCode: 429,
        retryAfterSeconds: null,
      }),
    );

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
    sendInviteEmailMock.mockRejectedValue(
      new EmailSendError("Too many requests", {
        code: "rate_limit_exceeded",
        statusCode: 429,
        retryAfterSeconds: 7,
      }),
    );

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
    sendInviteEmailMock.mockRejectedValue(
      new EmailSendError("Too many requests", {
        code: "rate_limit_exceeded",
        statusCode: 429,
        retryAfterSeconds: 7,
      }),
    );

    await expect(processEmailJob(boss, job)).rejects.toThrow("Too many requests");

    expect(sendAfterMock).not.toHaveBeenCalled();
    // The secret stays in place for the retries pg-boss now owns.
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("fails into the retry/dead-letter cycle when the monthly quota is exhausted", async () => {
    sendInviteEmailMock.mockRejectedValue(
      new EmailSendError("Monthly quota exceeded", {
        code: "monthly_quota_exceeded",
        statusCode: 429,
        retryAfterSeconds: null,
      }),
    );

    await expect(processEmailJob(boss, buildJob())).rejects.toThrow("Monthly quota exceeded");

    expect(sendAfterMock).not.toHaveBeenCalled();
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("rethrows transient provider failures so pg-boss retries with backoff", async () => {
    sendInviteEmailMock.mockRejectedValue(
      new EmailSendError("Internal server error", {
        code: "internal_server_error",
        statusCode: 500,
        retryAfterSeconds: null,
      }),
    );

    await expect(processEmailJob(boss, buildJob())).rejects.toThrow("Internal server error");

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

  it("still records the failure but leaves the payload alone when the job expired mid-handler", async () => {
    const abortController = new AbortController();
    abortController.abort();

    const result = await processDeadLetteredEmailJob(
      boss,
      buildDeadLetterJob(abortController.signal),
    );

    expect(markInviteEmailFailedMock).toHaveBeenCalledWith(INVITE_ID);
    expect(executeSqlMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "failure_recorded" });
  });
});

describe("password reset email jobs", () => {
  function buildResetDeadLetterJob(signal?: AbortSignal): Job<EmailJobData> {
    return { ...buildPasswordResetJob(signal), name: EMAIL_DEAD_LETTER_QUEUE };
  }

  it("submits the reset email with the unsealed URL and records provider acceptance", async () => {
    const job = buildPasswordResetJob();

    const result = await processEmailJob(boss, job);

    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith({
      email: "tenant@example.org",
      fullName: "Tenant User",
      resetUrl: RESET_URL,
      idempotencyKey: `password_reset/${RESET_ROW_ID}`,
      signal: job.signal,
    });
    expect(markPasswordResetEmailSubmittedMock).toHaveBeenCalledWith(RESET_ROW_ID);
    expect(result).toEqual({ status: "submitted", providerMessageId: "email_456" });
  });

  it("skips sending when the token row no longer exists", async () => {
    findPasswordResetEmailJobTargetMock.mockResolvedValue(null);

    const result = await processEmailJob(boss, buildPasswordResetJob());

    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    expect(markPasswordResetEmailSubmittedMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "password_reset_token_not_found" });
  });

  it("skips sending when the token was already used", async () => {
    findPasswordResetEmailJobTargetMock.mockResolvedValue({
      ...buildResetTarget(),
      usedAt: new Date(),
    });

    const result = await processEmailJob(boss, buildPasswordResetJob());

    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "password_reset_token_used" });
  });

  it("skips sending when the token expired or was superseded", async () => {
    findPasswordResetEmailJobTargetMock.mockResolvedValue({
      ...buildResetTarget(),
      expiresAt: new Date(Date.now() - 1),
    });

    const result = await processEmailJob(boss, buildPasswordResetJob());

    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "password_reset_token_expired" });
  });

  it("skips sending when the reset email was already submitted, even without a payload secret", async () => {
    findPasswordResetEmailJobTargetMock.mockResolvedValue({
      ...buildResetTarget(),
      sentAt: new Date(),
    });
    const job = buildPasswordResetJob();
    (job.data as { secret?: string }).secret = undefined;

    const result = await processEmailJob(boss, job);

    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "password_reset_already_submitted" });
  });

  it("fails into the retry/dead-letter cycle when an unsubmitted reset has no payload secret", async () => {
    const job = buildPasswordResetJob();
    (job.data as { secret?: string }).secret = undefined;

    await expect(processEmailJob(boss, job)).rejects.toThrow("no sealed payload secret");

    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it("stops before mutating state when the job expired during the send", async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      processEmailJob(boss, buildPasswordResetJob(abortController.signal)),
    ).rejects.toThrow("expired during send");

    expect(markPasswordResetEmailSubmittedMock).not.toHaveBeenCalled();
    expect(executeSqlMock).not.toHaveBeenCalled();
  });

  it("records the permanent failure on the token row and redacts the secret across both queues", async () => {
    const job = buildResetDeadLetterJob();

    const result = await processDeadLetteredEmailJob(boss, job);

    expect(markPasswordResetEmailFailedMock).toHaveBeenCalledWith(RESET_ROW_ID);
    expect(executeSqlMock).toHaveBeenCalledWith(expect.stringContaining("data - 'secret'"), [
      EMAIL_QUEUE,
      EMAIL_DEAD_LETTER_QUEUE,
      JSON.stringify({ type: "password_reset", passwordResetTokenId: RESET_ROW_ID }),
      job.id,
    ]);
    expect(result).toEqual({ status: "failure_recorded" });
  });

  it("keeps sentAt authoritative over a stray late failure record", async () => {
    // markPasswordResetEmailFailed itself guards on sentAt; here we only assert
    // a dead-lettered reset records failure exactly once per terminal outcome.
    const job = buildResetDeadLetterJob();

    await processDeadLetteredEmailJob(boss, job);

    expect(markPasswordResetEmailFailedMock).toHaveBeenCalledTimes(1);
  });
});
