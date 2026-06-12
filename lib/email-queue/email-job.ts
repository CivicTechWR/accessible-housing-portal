import "server-only";

import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

import { getAccountInviteEmailIdempotencyKey } from "@/lib/auth/invite-email";

/** Fields shared by every email job payload. */
type EmailJobBase = {
  /**
   * Times this logical email has been re-enqueued by a quota/rate-limit
   * deferral. The worker caps the chain (MAX_EMAIL_JOB_DEFERRALS) so a
   * provider stuck returning quota errors eventually dead-letters instead of
   * deferring forever.
   */
  deferralCount?: number;
};

/**
 * Durable email job payloads, stored as pg-boss job rows in Postgres.
 *
 * Payloads carry stable entity references (ids); the worker derives recipient,
 * subject, and body at send time. Anything that cannot be re-derived and is
 * sensitive (raw one-time tokens, invite/reset URLs) must go in the sealed
 * `secret` field, which is encrypted at rest and redacted after the job
 * completes. Never add plaintext secrets or full rendered emails here.
 */
export type AccountInviteEmailJobData = EmailJobBase & {
  type: "account_invite";
  inviteId: string;
  /** Sealed invite URL; contains the raw one-time token, so never store it in plaintext. */
  secret: string;
};

export type EmailJobData = AccountInviteEmailJobData;

export type EmailJobType = EmailJobData["type"];

/**
 * Higher priority jobs are fetched first. One-time, user-initiated emails
 * (invites, password resets, application notifications) must outrank future
 * batch emails (saved search alerts, digests) when the remaining Resend daily
 * budget is constrained.
 */
export const EMAIL_JOB_PRIORITY = {
  account_invite: 20,
} as const satisfies Record<EmailJobType, number>;

/**
 * Stable key for the logical email, shared with the Resend idempotency key so
 * provider-side dedupe and queue-side dedupe agree on identity.
 */
export function getEmailJobIdempotencyKey(data: EmailJobData): string {
  switch (data.type) {
    case "account_invite":
      return getAccountInviteEmailIdempotencyKey(data.inviteId);
  }
}

/**
 * Deterministic job id (UUID) derived from the logical email key, so enqueueing
 * the same logical email twice dedupes via primary-key conflict for as long as
 * the first job row is retained — unlike singletonKey, which only dedupes
 * queued/active jobs. The Resend idempotency key remains the provider-side
 * guarantee against double sends.
 */
export function getEmailJobId(data: EmailJobData): string {
  const hex = createHash("sha256").update(getEmailJobIdempotencyKey(data)).digest("hex");
  const variant = ((Number.parseInt(hex[16] as string, 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function buildAccountInviteEmailJob(params: {
  inviteId: string;
  inviteUrl: string;
}): AccountInviteEmailJobData {
  return {
    type: "account_invite",
    inviteId: params.inviteId,
    secret: sealEmailJobSecret(params.inviteUrl),
  };
}

const SECRET_FORMAT_VERSION = "v1";
const SECRET_KEY_INFO = `email-job-secret/${SECRET_FORMAT_VERSION}`;

/** AES-256-GCM seal for sensitive job payload fields. */
export function sealEmailJobSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSecretKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return [
    SECRET_FORMAT_VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function openEmailJobSecret(sealed: string): string {
  const [version, iv, ciphertext, authTag] = sealed.split(".");

  if (version !== SECRET_FORMAT_VERSION || !iv || !ciphertext || !authTag) {
    throw new Error("Unrecognized email job secret format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getSecretKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getSecretKey() {
  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    throw new Error("AUTH_SECRET is not set.");
  }

  return Buffer.from(hkdfSync("sha256", authSecret, "", SECRET_KEY_INFO, 32));
}
