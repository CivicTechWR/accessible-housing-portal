import "server-only";

import { sendEmail } from "@/lib/email";

export async function sendPasswordResetEmail(params: {
  email: string;
  fullName: string;
  resetUrl: string;
}) {
  const resetUrl = getSafeResetUrl(params.resetUrl);
  const idempotencyKey = getPasswordResetEmailIdempotencyKey(resetUrl);

  return await sendEmail({
    to: params.email,
    subject: "Reset your Affordable Housing Portal password",
    text: `Hello ${params.fullName},\n\nWe received a request to reset your password for the Affordable Housing Portal.\n\nUse the link below to set a new password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(params.fullName)},</p><p>We received a request to reset your password for the Affordable Housing Portal.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    idempotencyKey,
  });
}

export function getPasswordResetEmailIdempotencyKey(resetUrl: string) {
  const token = new URL(resetUrl).searchParams.get("token")?.trim();

  if (!token) {
    throw new Error("Reset URL must include a token query parameter.");
  }

  return `password_reset/${token}`;
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