import "server-only";

import { createResendClient, getEmailFromAddress } from "@/lib/email";

export async function sendPasswordResetEmail(params: {
  email: string;
  fullName: string;
  resetUrl: string;
}) {
  const resend = createResendClient();
  const resetUrl = getSafeResetUrl(params.resetUrl);

  const result = await resend.emails.send({
    from: getEmailFromAddress(),
    to: params.email,
    subject: "Reset your Affordable Housing Portal password",
    text: `Hello ${params.fullName},\n\nWe received a request to reset your password for the Affordable Housing Portal.\n\nUse the link below to set a new password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(params.fullName)},</p><p>We received a request to reset your password for the Affordable Housing Portal.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
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