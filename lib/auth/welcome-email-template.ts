export type WelcomeEmailAudience = "navigator" | "provider";

const feedbackUrl =
  "https://docs.google.com/forms/d/e/1FAIpQLSdmgdBsahBMIuU6AQngwArIKwCn_yJHZ299YtyT2FtT_FahCQ/viewform?usp=sharing";

const welcomeContent = {
  navigator: {
    subject: "Welcome to Home Hub, housing navigation for your clients",
    introduction:
      "Welcome to Home Hub! Thank you for joining us as an early user. Home Hub connects community members and housing navigators with affordable, supportive, and accessible housing listings in one place.",
    expectations: [
      "Relevant listings: Access non-profit, co-operative, and municipal housing options in one place.",
      "Accessibility and pricing details: View physical accessibility features, unit costs, and eligibility criteria up front.",
      "Direct connections: Contact housing providers on behalf of the community members you support.",
    ],
    accountAccess: "explore listings and connect with housing providers",
    pilot:
      "Home Hub is in its pilot phase. We are refining the platform based on real-world use. Your experience as a case worker or social worker helps us understand what works and what needs to change. Please share bugs, ideas, or feedback with us.",
  },
  provider: {
    subject: "Welcome to Home Hub, connecting your properties with the community",
    introduction:
      "Thank you for joining Home Hub! The platform helps community housing providers, non-profits, co-operatives, and municipal partners share available units and connect directly with housing navigators, case workers, and social support organizations.",
    expectations: [
      "Centralized visibility: Share available units with housing navigators and case workers.",
      "Clear listing details: Describe your property's affordability terms, unit features, and accessibility accommodations.",
      "Direct communication: Interested users can contact your team using the contact details you share on the platform.",
    ],
    accountAccess: "explore the platform and create listings",
    pilot:
      "Home Hub is a live pilot. We are testing and improving the platform, and welcome your feedback as you create listings and use the site. Please tell us how we can make it more useful for your team.",
  },
};

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
  const content = welcomeContent[params.audience];
  const partnership =
    "Home Hub was built through a partnership between Union Co-Operative and CivicTech WR to help people find affordable, supportive, and accessible housing in our community.";
  const nextSteps = `You will receive a separate system email inviting you to create an account in Home Hub. Once you have activated your account, you can ${content.accountAccess}. We would also like to book a 30-minute call with you or your teammates to answer questions about using the site.`;

  return {
    subject: content.subject,
    text: [
      `Hi ${params.fullName},`,
      content.introduction,
      partnership,
      "What you can expect",
      content.expectations.map((item) => `- ${item}`).join("\n"),
      "What comes next",
      nextSteps,
      "Help us build this together",
      content.pilot,
      `Share feedback: ${feedbackUrl}`,
      `Community Agreement & Terms of Use: ${agreementUrl}`,
      `After activating your account, sign in here: ${signInUrl}`,
      "The Home Hub Team",
    ].join("\n\n"),
    html: `<div style="max-width:640px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#222">
<p>Hi ${escapeHtml(params.fullName)},</p>
<p>${escapeHtml(content.introduction)}</p>
<p>Home Hub was built through a partnership between <a href="https://www.unionsd.coop/">Union Co-Operative</a> and <a href="https://civictechwr.org/">CivicTech WR</a> to help people find affordable, supportive, and accessible housing in our community.</p>
<h2>What you can expect</h2>
<ul>${content.expectations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
<h2>What comes next</h2>
<p>${escapeHtml(nextSteps)}</p>
<h2>Help us build this together</h2>
<p>${escapeHtml(content.pilot)}</p>
<p><a href="${escapeHtml(feedbackUrl)}">Share feedback</a></p>
<p><a href="${escapeHtml(agreementUrl)}">Community Agreement &amp; Terms of Use</a></p>
<p>After activating your account, <a href="${escapeHtml(signInUrl)}">sign in to Home Hub</a>.</p>
<p>The Home Hub Team</p>
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
