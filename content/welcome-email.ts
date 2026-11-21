import { siteConfig } from "@/lib/site-config";

// The partner names sit between `aboutLead` and `aboutRest` so the HTML version can link them.
export const welcomeEmailContent = {
  navigator: {
    subject: `Welcome to ${siteConfig.name} — Simplifying housing navigation for your clients`,
    introduction: `Welcome to ${siteConfig.name}! We're thrilled to have you join us as an early user.`,
    aboutLead: `${siteConfig.name} was co-created through a partnership between`,
    aboutRest: ` to address a critical challenge in our community—making it easier to find and access affordable and accessible housing. Instead of navigating dozens of separate waitlists, ${siteConfig.name} provides a centralized digital space connecting community members and housing navigators directly with non-market housing listings.`,
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
    pilot: `Please keep in mind that ${siteConfig.name} is currently in its pilot phase. As a prototype, we are actively refining features based on real-world use. Your frontline experience as a case worker or social worker is invaluable to us—if you spot bugs, have ideas, or want to share feedback, please let us know!`,
    signOff: "Warmly,",
  },
  provider: {
    subject: `Welcome to ${siteConfig.name} — Connecting your properties with the community`,
    introduction: `Thank you for joining ${siteConfig.name}! We are excited to partner with your organization to streamline affordable and accessible housing matching across our region.`,
    aboutLead: `${siteConfig.name} is a regional platform built through a collaboration between`,
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
    pilot: `Because ${siteConfig.name} is a live pilot, we are continuously testing and making improvements. We view our housing providers as true co-builders of this tool. As you create listings and interact with the platform, we warmly welcome your feedback on how we can make the tool more efficient for your team.`,
    signOff: "In community,",
  },
};
