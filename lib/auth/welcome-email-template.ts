import { welcomeEmailContent } from "@/content/welcome-email";
import { siteConfig } from "@/lib/site-config";

export type WelcomeEmailAudience = keyof typeof welcomeEmailContent;

export function buildWelcomeEmail(params: {
  fullName: string;
  audience: WelcomeEmailAudience;
  platformUrl: string;
}) {
  const platformUrl = new URL(params.platformUrl);
  if (platformUrl.protocol !== "http:" && platformUrl.protocol !== "https:") {
    throw new Error("Platform URL must use http or https.");
  }

  const signInUrl = new URL("/sign-in", platformUrl.origin).toString();
  const agreementUrl = new URL("/community-agreement", platformUrl.origin).toString();
  const content = welcomeEmailContent[params.audience];
  const { operator, builder, bookingUrl, feedbackFormUrl } = siteConfig;
  const invitationNotice = `You will receive a system-generated email inviting you to create an account in ${siteConfig.name}.`;
  const nextSteps = `Once created, you will be able to ${content.accountAccess}. As an additional support, you may book a 30 min call with us to answer any questions you may have.`;

  return {
    subject: content.subject,
    text: [
      `Hi ${params.fullName},`,
      content.introduction,
      `What is ${siteConfig.name}?`,
      `${content.aboutLead} ${operator.name} and ${builder.name}${content.aboutRest}`,
      "What You Can Expect",
      content.expectations.map((item) => `- ${item.title}: ${item.body}`).join("\n"),
      "What Comes Next",
      `${invitationNotice} ${nextSteps}`,
      `Book a call: ${bookingUrl}`,
      content.pilotHeading,
      content.pilot,
      `Fill out our feedback form: ${feedbackFormUrl}`,
      `Community Agreement & Terms of Use: ${agreementUrl}`,
      `Ready to get started? After activating your account, log in here: ${signInUrl}`,
      `${content.signOff}\nThe ${siteConfig.name} Team`,
    ].join("\n\n"),
    html: `<div style="max-width:640px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#222">
<p>Hi ${escapeHtml(params.fullName)},</p>
<p>${escapeHtml(content.introduction)}</p>
<h2>What is ${escapeHtml(siteConfig.name)}?</h2>
<p>${escapeHtml(content.aboutLead)} <a href="${escapeHtml(operator.url)}">${escapeHtml(operator.name)}</a> and <a href="${escapeHtml(builder.url)}">${escapeHtml(builder.name)}</a>${escapeHtml(content.aboutRest)}</p>
<h2>What You Can Expect</h2>
<ul>${content.expectations.map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.body)}</li>`).join("")}</ul>
<h2>What Comes Next</h2>
<p><strong>${escapeHtml(invitationNotice)}</strong> ${escapeHtml(nextSteps)} <a href="${escapeHtml(bookingUrl)}">Click here to book a call if you would like.</a></p>
<h2>${escapeHtml(content.pilotHeading)}</h2>
<p>${escapeHtml(content.pilot)}</p>
<p><a href="${escapeHtml(feedbackFormUrl)}"><strong>Click here to fill out our feedback form.</strong></a></p>
<p><a href="${escapeHtml(agreementUrl)}">Community Agreement &amp; Terms of Use</a></p>
<p>Ready to get started? After activating your account, <a href="${escapeHtml(signInUrl)}">log in to ${escapeHtml(siteConfig.name)}</a>.</p>
<p>${escapeHtml(content.signOff)}<br>The ${escapeHtml(siteConfig.name)} Team</p>
</div>`,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
