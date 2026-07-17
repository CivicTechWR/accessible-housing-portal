/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  buildAccountInviteEmailJob,
  getEmailJobId,
  getEmailJobIdempotencyKey,
  openEmailJobSecret,
  sealEmailJobSecret,
} from "@/lib/email-queue/email-job";

const ORIGINAL_ENV = process.env;
const INVITE_ID = "2e42f745-44e8-4ab7-a2a2-c1f42cc8e204";
const INVITE_URL = "https://housing.example.org/invite?token=raw-one-time-token";

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

describe("getEmailJobIdempotencyKey", () => {
  it("matches the Resend idempotency key for the logical email", () => {
    expect(
      getEmailJobIdempotencyKey({ type: "account_invite", inviteId: INVITE_ID, secret: "x" }),
    ).toBe(`account_invite/${INVITE_ID}`);
  });
});

describe("getEmailJobId", () => {
  it("derives a stable UUID from the logical email key", () => {
    const data = { type: "account_invite", inviteId: INVITE_ID, secret: "x" } as const;
    const jobId = getEmailJobId(data);

    expect(jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getEmailJobId({ ...data, secret: "a-different-sealed-secret" })).toBe(jobId);
  });

  it("differs across logical emails", () => {
    const jobId = getEmailJobId({ type: "account_invite", inviteId: INVITE_ID, secret: "x" });
    const otherJobId = getEmailJobId({
      type: "account_invite",
      inviteId: "0f5cce0c-92e5-4ab0-a06d-21c5a8f4ff79",
      secret: "x",
    });

    expect(otherJobId).not.toBe(jobId);
  });
});

describe("buildAccountInviteEmailJob", () => {
  it("stores only the invite reference and a sealed secret", () => {
    const job = buildAccountInviteEmailJob({ inviteId: INVITE_ID, inviteUrl: INVITE_URL });

    expect(Object.keys(job).sort()).toEqual(["inviteId", "secret", "type"]);
    expect(job.inviteId).toBe(INVITE_ID);
    expect(JSON.stringify(job)).not.toContain("raw-one-time-token");
    expect(openEmailJobSecret(job.secret)).toBe(INVITE_URL);
  });
});
