export type WelcomeEmailAudience = "navigator" | "provider";

const feedbackUrl =
  "https://docs.google.com/forms/d/e/1FAIpQLSdmgdBsahBMIuU6AQngwArIKwCn_yJHZ299YtyT2FtT_FahCQ/viewform?usp=sharing";
const bookingUrl = "https://calendar.app.google/Yc5KABhWMtDBFg5p7";

// The partner names sit between `aboutLead` and `aboutRest` so the HTML version can link them.
const welcomeContent = {
  navigator: {
    subject: "Welcome to Home Hub — Simplifying housing navigation for your clients",
    introduction: "Welcome to Home Hub! We're thrilled to have you join us as an early user.",
    aboutLead: "Home Hub was co-created through a partnership between",
    aboutRest:
      " to address a critical challenge in our community—making it easier to find and access affordable and accessible housing. Instead of navigating dozens of separate waitlists, Home Hub provides a centralized digital space connecting community members and housing navigators directly with non-market housing listings.",
    expectations: [
      {
        title: "Tailored Relevant Listings",
        body: "Access non-profit, co-operative, and municipal housing options in one place.",
      },
      {
        title: "Clear Accessibility & Pricing Details",
        body: "Easily view physical accessibility features, unit costs, and eligibility criteria up front.",
      },
      {
        title: "Direct Connections",
        body: "Streamline outreach to housing providers on behalf of the community members you support.",
      },
    ],
    accountAccess: "explore listings and connect with housing providers",
    pilotHeading: "Help Us Build This Together",
    pilot:
      "Please keep in mind that Home Hub is currently in its pilot phase. As a prototype, we are actively refining features based on real-world use. Your frontline experience as a case worker or social worker is invaluable to us—if you spot bugs, have ideas, or want to share feedback, please let us know!",
    signOff: "Warmly,",
  },
  provider: {
    subject: "Welcome to Home Hub — Connecting your properties with the community",
    introduction:
      "Thank you for joining Home Hub! We are excited to partner with your organization to streamline affordable and accessible housing matching across our region.",
    aboutLead: "Home Hub is a regional platform built through a collaboration between",
    aboutRest:
      ". It was designed specifically for community housing providers, non-profits, co-operatives, and municipal partners to showcase available units and connect directly with housing navigators, case workers and social support organizations.",
    expectations: [
      {
        title: "Centralized Visibility",
        body: "Reach established and trusted housing navigators and case workers without relying on fragmented listing channels or word-of-mouth.",
      },
      {
        title: "Transparent Attributes",
        body: "Highlight your property's specific affordability terms, unit features, and accessibility accommodations.",
      },
      {
        title: "Direct Communication",
        body: "Allow interested parties to reach out to your team directly based on your shared contact preferences.",
      },
    ],
    accountAccess: "explore the platform and create listings",
    pilotHeading: "A Note on Our Pilot Phase",
    pilot:
      "Because Home Hub is a live pilot, we are continuously testing and making improvements. We view our housing providers as true co-builders of this tool. As you create listings and interact with the platform, we warmly welcome your feedback on how we can make the tool more efficient for your team.",
    signOff: "In community,",
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
  const invitationNotice =
    "You will receive a system-generated email inviting you to create an account in Home Hub.";
  const nextSteps = `Once created, you will be able to ${content.accountAccess}. As an additional support, you may book a 30 min call with us to answer any questions you may have.`;

  return {
    subject: content.subject,
    text: [
      `Hi ${params.fullName},`,
      content.introduction,
      "What is Home Hub?",
      `${content.aboutLead} Union Co-Operative and CivicTech${content.aboutRest}`,
      "What You Can Expect",
      content.expectations.map((item) => `- ${item.title}: ${item.body}`).join("\n"),
      "What Comes Next",
      `${invitationNotice} ${nextSteps}`,
      `Book a call: ${bookingUrl}`,
      content.pilotHeading,
      content.pilot,
      `Fill out our feedback form: ${feedbackUrl}`,
      `Community Agreement & Terms of Use: ${agreementUrl}`,
      `Ready to get started? After activating your account, log in here: ${signInUrl}`,
      `${content.signOff}\nThe Home Hub Team`,
    ].join("\n\n"),
    html: `<div style="max-width:640px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#222">
<p>Hi ${escapeHtml(params.fullName)},</p>
<p>${escapeHtml(content.introduction)}</p>
<h2>What is Home Hub?</h2>
<p>${escapeHtml(content.aboutLead)} <a href="https://www.unionsd.coop/">Union Co-Operative</a> and <a href="https://civictechwr.org/">CivicTech</a>${escapeHtml(content.aboutRest)}</p>
<h2>What You Can Expect</h2>
<ul>${content.expectations.map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.body)}</li>`).join("")}</ul>
<h2>What Comes Next</h2>
<p><strong>${escapeHtml(invitationNotice)}</strong> ${escapeHtml(nextSteps)} <a href="${escapeHtml(bookingUrl)}">Click here to book a call if you would like.</a></p>
<h2>${escapeHtml(content.pilotHeading)}</h2>
<p>${escapeHtml(content.pilot)}</p>
<p><a href="${escapeHtml(feedbackUrl)}"><strong>Click here to fill out our feedback form.</strong></a></p>
<p><a href="${escapeHtml(agreementUrl)}">Community Agreement &amp; Terms of Use</a></p>
<p>Ready to get started? After activating your account, <a href="${escapeHtml(signInUrl)}">log in to Home Hub</a>.</p>
<p>${escapeHtml(content.signOff)}<br>The Home Hub Team</p>
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
