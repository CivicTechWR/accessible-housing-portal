import "server-only";

import { sendEmail, type TransactionalEmailSendOptions } from "@/lib/email";

export async function sendInviteEmail(
  params: {
    email: string;
    fullName: string;
    inviteUrl: string;
  } & TransactionalEmailSendOptions,
) {
  const inviteUrl = getSafeInviteUrl(params.inviteUrl);
  await sendEmail({
    to: params.email,
    subject: "You’ve been invited to the Affordable Housing Portal",
    text: `Hello ${params.fullName},\n\nYou’ve been invited to the Affordable Housing Portal. Use the link below to create your password and activate your account:\n\n${inviteUrl}\n\nIf you were not expecting this invite, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(params.fullName)},</p><p>You’ve been invited to the Affordable Housing Portal.</p><p><a href="${escapeHtml(inviteUrl)}">Create your password and activate your account</a></p><p>If you were not expecting this invite, you can ignore this email.</p>`,
    idempotencyKey: params.idempotencyKey,
  });
}

export function getAccountInviteEmailIdempotencyKey(inviteId: string) {
  return `account_invite/${inviteId}`;
}

function getSafeInviteUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Invite URL must use http or https.");
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
