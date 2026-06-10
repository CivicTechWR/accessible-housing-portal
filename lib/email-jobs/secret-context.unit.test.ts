import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { decryptSecretContext, encryptSecretContext } from "./secret-context";

const SECRET_KEY = Buffer.alloc(32, 7).toString("base64");
const INVITE_URL = "https://housing.example.org/invite?token=super-secret-token";

const originalEnv = {
  emailJobSecretKey: process.env.EMAIL_JOB_SECRET_KEY,
  authSecret: process.env.AUTH_SECRET,
};

describe("secret context encryption", () => {
  beforeEach(() => {
    process.env.EMAIL_JOB_SECRET_KEY = SECRET_KEY;
    delete process.env.AUTH_SECRET;
  });

  afterEach(() => {
    if (originalEnv.emailJobSecretKey === undefined) {
      delete process.env.EMAIL_JOB_SECRET_KEY;
    } else {
      process.env.EMAIL_JOB_SECRET_KEY = originalEnv.emailJobSecretKey;
    }

    if (originalEnv.authSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = originalEnv.authSecret;
    }
  });

  it("round-trips a secret context object", () => {
    const encrypted = encryptSecretContext({ inviteUrl: INVITE_URL });

    expect(decryptSecretContext<{ inviteUrl: string }>(encrypted)).toEqual({
      inviteUrl: INVITE_URL,
    });
  });

  it("never stores the plaintext secret in the encrypted buffer", () => {
    const encrypted = encryptSecretContext({ inviteUrl: INVITE_URL });
    const rawBytes = encrypted.toString("latin1");

    expect(rawBytes).not.toContain("super-secret-token");
    expect(rawBytes).not.toContain("inviteUrl");
  });

  it("produces different ciphertexts for the same value (random IV)", () => {
    const first = encryptSecretContext({ inviteUrl: INVITE_URL });
    const second = encryptSecretContext({ inviteUrl: INVITE_URL });

    expect(first.equals(second)).toBe(false);
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecretContext({ inviteUrl: INVITE_URL });
    const lastIndex = encrypted.length - 1;
    encrypted[lastIndex] = (encrypted[lastIndex] ?? 0) ^ 0xff;

    expect(() => decryptSecretContext(encrypted)).toThrow();
  });

  it("rejects buffers with an unknown format version", () => {
    const encrypted = encryptSecretContext({ inviteUrl: INVITE_URL });
    encrypted[0] = 99;

    expect(() => decryptSecretContext(encrypted)).toThrow(
      "Email job secret context has an unsupported format.",
    );
  });

  it("rejects keys that are not 32 bytes", () => {
    process.env.EMAIL_JOB_SECRET_KEY = Buffer.alloc(16, 1).toString("base64");

    expect(() => encryptSecretContext({ inviteUrl: INVITE_URL })).toThrow(
      "EMAIL_JOB_SECRET_KEY must decode to 32 bytes of base64",
    );
  });

  it("falls back to a key derived from AUTH_SECRET", () => {
    delete process.env.EMAIL_JOB_SECRET_KEY;
    process.env.AUTH_SECRET = "auth-secret-for-tests";

    const encrypted = encryptSecretContext({ inviteUrl: INVITE_URL });

    expect(decryptSecretContext<{ inviteUrl: string }>(encrypted)).toEqual({
      inviteUrl: INVITE_URL,
    });
  });

  it("requires some key material", () => {
    delete process.env.EMAIL_JOB_SECRET_KEY;
    delete process.env.AUTH_SECRET;

    expect(() => encryptSecretContext({ inviteUrl: INVITE_URL })).toThrow(
      "Set EMAIL_JOB_SECRET_KEY or AUTH_SECRET",
    );
  });
});
