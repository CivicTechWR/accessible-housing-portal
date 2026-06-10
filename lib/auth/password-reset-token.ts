import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type PasswordResetTokenPayload = {
  userId: string;
  passwordHash: string;
  exp: number;
};

export class InvalidPasswordResetTokenError extends Error {
  constructor() {
    super("Password reset token is invalid.");
    this.name = "InvalidPasswordResetTokenError";
  }
}

const DEFAULT_TTL_SECONDS = 60 * 30;

export function createPasswordResetToken(params: {
  userId: string;
  passwordHash: string;
  ttlSeconds?: number;
}) {
  const payload: PasswordResetTokenPayload = {
    userId: params.userId,
    passwordHash: params.passwordHash,
    exp: Math.floor(Date.now() / 1000) + (params.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyPasswordResetToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || token.split(".").length !== 2) {
    throw new InvalidPasswordResetTokenError();
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new InvalidPasswordResetTokenError();
  }

  let payload: PasswordResetTokenPayload;

  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as PasswordResetTokenPayload;
  } catch {
    throw new InvalidPasswordResetTokenError();
  }

  if (
    typeof payload.userId !== "string" ||
    typeof payload.passwordHash !== "string" ||
    typeof payload.exp !== "number"
  ) {
    throw new InvalidPasswordResetTokenError();
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new InvalidPasswordResetTokenError();
  }

  return payload;
}

function getPasswordResetSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not set.");
  }

  return secret;
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getPasswordResetSecret()).update(encodedPayload).digest("base64url");
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}