/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import type { EmailDeliveryAttemptRef } from "@/lib/email-delivery/attempt";
import {
  buildAccountInviteEmailJob,
  buildPasswordResetEmailJob,
  getEmailJobId,
  getEmailJobIdempotencyKey,
  getEmailJobMatch,
  openEmailJobSecret,
  sealEmailJobSecret,
} from "@/lib/email-queue/email-job";

const ORIGINAL_ENV = process.env;
const INVITE_ID = "2e42f745-44e8-4ab7-a2a2-c1f42cc8e204";
const INVITE_URL = "https://housing.example.org/invite?token=raw-one-time-token";
const RESET_ROW_ID = "8c3f0a52-9b1d-4e6f-a7c2-d4b8e1f0a399";
const RESET_URL = "https://housing.example.org/reset-password?oneTimeLink=raw-one-time-reset-link";
const RESET_ATTEMPT = {
  id: "reset-attempt-1",
  deliveryId: "reset-delivery-1",
  emailType: "password_reset",
  attemptNumber: 1,
  idempotencyKey: `password_reset/${RESET_ROW_ID}/attempt/1`,
} as const;

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    AUTH_SECRET: "test-auth-secret",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("sealEmailJobSecret/openEmailJobSecret", () => {
  it("round-trips a sealed secret", () => {
    expect(openEmailJobSecret(sealEmailJobSecret(INVITE_URL))).toBe(INVITE_URL);
  });

  it("never stores the plaintext inside the sealed value", () => {
    const sealed = sealEmailJobSecret(INVITE_URL);

    expect(sealed).not.toContain("raw-one-time-token");
    expect(sealed).not.toContain(Buffer.from(INVITE_URL).toString("base64url"));
  });

  it("rejects tampered ciphertext", () => {
    const sealed = sealEmailJobSecret(INVITE_URL);
    const [version, iv, ciphertext, authTag] = sealed.split(".");
    const tampered = [
      version,
      iv,
      ciphertext?.startsWith("A") ? `B${ciphertext.slice(1)}` : `A${ciphertext?.slice(1)}`,
      authTag,
    ].join(".");

    expect(() => openEmailJobSecret(tampered)).toThrow();
  });

  it("rejects unrecognized formats", () => {
    expect(() => openEmailJobSecret("v0.not.a.secret")).toThrow(
      "Unrecognized email job secret format.",
    );
  });

  it("rejects secrets sealed under a different AUTH_SECRET", () => {
    const sealed = sealEmailJobSecret(INVITE_URL);
    process.env.AUTH_SECRET = "rotated-auth-secret";

    expect(() => openEmailJobSecret(sealed)).toThrow();
  });

  it("requires AUTH_SECRET", () => {
    delete process.env.AUTH_SECRET;

    expect(() => sealEmailJobSecret(INVITE_URL)).toThrow("AUTH_SECRET is not set.");
  });
});

function buildAttempt(attemptNumber: number): EmailDeliveryAttemptRef {
  return {
    id: `attempt-${attemptNumber}`,
    deliveryId: "6d5a1a9a-8f1f-4d1e-9a2e-3b0f5a2c7d11",
    emailType: "account_invite",
    attemptNumber,
    idempotencyKey: `account_invite/${INVITE_ID}/attempt/${attemptNumber}`,
  };
}

describe("getEmailJobIdempotencyKey", () => {
  it("uses the attempt's key, so the queue and Resend dedupe on the same identity", () => {
    expect(
      getEmailJobIdempotencyKey({
        type: "account_invite",
        inviteId: INVITE_ID,
        attempt: buildAttempt(1),
        secret: "x",
      }),
    ).toBe(`account_invite/${INVITE_ID}/attempt/1`);
  });
});

describe("getEmailJobId", () => {
  it("derives a stable UUID from the attempt key, so re-enqueueing an attempt dedupes", () => {
    const data = {
      type: "account_invite",
      inviteId: INVITE_ID,
      attempt: buildAttempt(1),
      secret: "x",
    } as const;
    const jobId = getEmailJobId(data);

    expect(jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getEmailJobId({ ...data, secret: "a-different-sealed-secret" })).toBe(jobId);
  });

  it("gives a resend of the same invite a different job id", () => {
    const data = {
      type: "account_invite",
      inviteId: INVITE_ID,
      attempt: buildAttempt(1),
      secret: "x",
    } as const;

    expect(getEmailJobId({ ...data, attempt: buildAttempt(2) })).not.toBe(getEmailJobId(data));
  });
});

describe("buildAccountInviteEmailJob", () => {
  it("stores only the invite reference, the attempt, and a sealed secret", () => {
    const attempt = buildAttempt(1);
    const job = buildAccountInviteEmailJob({
      inviteId: INVITE_ID,
      inviteUrl: INVITE_URL,
      attempt,
    });

    expect(Object.keys(job).sort()).toEqual(["attempt", "inviteId", "secret", "type"]);
    expect(job.inviteId).toBe(INVITE_ID);
    expect(job.attempt).toEqual(attempt);
    expect(JSON.stringify(job)).not.toContain("raw-one-time-token");
    expect(openEmailJobSecret(job.secret)).toBe(INVITE_URL);
  });
});

describe("password reset jobs", () => {
  it("uses the persisted reset attempt for idempotency", () => {
    const data = buildPasswordResetEmailJob({
      tokenId: RESET_ROW_ID,
      resetUrl: RESET_URL,
      attempt: RESET_ATTEMPT,
    });

    expect(getEmailJobIdempotencyKey(data)).toBe(RESET_ATTEMPT.idempotencyKey);
    expect(getEmailJobIdempotencyKey(data)).not.toContain("raw-one-time-reset-link");
  });

  it("derives a stable job id independent of the sealed secret", () => {
    const data = buildPasswordResetEmailJob({
      tokenId: RESET_ROW_ID,
      resetUrl: RESET_URL,
      attempt: RESET_ATTEMPT,
    });
    const otherData = buildPasswordResetEmailJob({
      tokenId: RESET_ROW_ID,
      resetUrl: `${RESET_URL}&resealed=1`,
      attempt: RESET_ATTEMPT,
    });

    expect(getEmailJobId(data)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    // A deferral replacement re-seals the secret; the logical email must keep
    // one stable identity across the chain.
    expect(getEmailJobId(otherData)).toBe(getEmailJobId(data));
    expect(getEmailJobId(data)).not.toBe(
      getEmailJobId(
        buildAccountInviteEmailJob({
          inviteId: INVITE_ID,
          inviteUrl: INVITE_URL,
          attempt: buildAttempt(1),
        }),
      ),
    );
  });

  it("matches every row of the logical email by type and token id", () => {
    const data = buildPasswordResetEmailJob({
      tokenId: RESET_ROW_ID,
      resetUrl: RESET_URL,
      attempt: RESET_ATTEMPT,
    });

    expect(getEmailJobMatch(data)).toEqual({
      type: "password_reset",
      passwordResetTokenId: RESET_ROW_ID,
    });
  });

  it("stores only the token reference and a sealed secret", () => {
    const job = buildPasswordResetEmailJob({
      tokenId: RESET_ROW_ID,
      resetUrl: RESET_URL,
      attempt: RESET_ATTEMPT,
    });

    expect(Object.keys(job).sort()).toEqual(["attempt", "passwordResetTokenId", "secret", "type"]);
    expect(job.passwordResetTokenId).toBe(RESET_ROW_ID);
    expect(job.attempt).toEqual(RESET_ATTEMPT);
    expect(JSON.stringify(job)).not.toContain("raw-one-time-reset-link");
    expect(openEmailJobSecret(job.secret)).toBe(RESET_URL);
  });
});
