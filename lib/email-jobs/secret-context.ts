import "server-only";

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const FORMAT_VERSION = 1;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const HKDF_INFO = "email-job-secret-context";

/**
 * Uses EMAIL_JOB_SECRET_KEY (32 bytes, base64, e.g. `openssl rand -base64 32`)
 * when set; otherwise derives a dedicated key from AUTH_SECRET. Rotating the
 * effective key makes pending jobs undecryptable; they fail with a clear error
 * after retries are exhausted.
 */
function getSecretContextKey() {
  const configured = process.env.EMAIL_JOB_SECRET_KEY;

  if (configured) {
    const key = Buffer.from(configured, "base64");

    if (key.length !== KEY_LENGTH) {
      throw new Error(
        "EMAIL_JOB_SECRET_KEY must decode to 32 bytes of base64. Generate one with `openssl rand -base64 32`.",
      );
    }

    return key;
  }

  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    throw new Error("Set EMAIL_JOB_SECRET_KEY or AUTH_SECRET to protect email job payloads.");
  }

  return Buffer.from(hkdfSync("sha256", authSecret, "", HKDF_INFO, KEY_LENGTH));
}

export function encryptSecretContext(value: object) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getSecretContextKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);

  return Buffer.concat([Buffer.from([FORMAT_VERSION]), iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptSecretContext<T>(encrypted: Buffer): T {
  if (encrypted.length < 1 + IV_LENGTH + AUTH_TAG_LENGTH || encrypted[0] !== FORMAT_VERSION) {
    throw new Error("Email job secret context has an unsupported format.");
  }

  const iv = encrypted.subarray(1, 1 + IV_LENGTH);
  const authTag = encrypted.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encrypted.subarray(1 + IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", getSecretContextKey(), iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(plaintext.toString("utf8")) as T;
}
