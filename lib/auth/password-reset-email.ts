import "server-only";

import { sendEmail, type TransactionalEmailSendOptions } from "@/lib/email";

export async function sendPasswordResetEmail(
  params: {
    email: string;
    fullName: string;
    resetUrl: string;
    signal?: AbortSignal;
  } & TransactionalEmailSendOptions,
) {
  const resetUrl = getSafeResetUrl(params.resetUrl);
  return await sendEmail({
    to: params.email,
    signal: params.signal,
    subject: "Reset your Affordable Housing Portal password",
    text: `Hello ${params.fullName},\n\nWe received a request to reset your password for the Affordable Housing Portal.\n\nUse the link below to set a new password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(params.fullName)},</p><p>We received a request to reset your password for the Affordable Housing Portal.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    idempotencyKey: params.idempotencyKey,
  });
}

/**
 * Stable per-logical-email key derived from the password reset token row id —
 * never from the raw token or reset URL, which must not be recoverable from
 * the key.
 */
export function getPasswordResetEmailIdempotencyKey(passwordResetTokenId: string) {
  return `password_reset/${passwordResetTokenId}`;
}

function getSafeResetUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Reset URL must use http or https.");
  }

  return url.toString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
