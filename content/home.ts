import { siteConfig } from "@/lib/site-config";

export const homeContent = {
  about: {
    // The section renders the site name before `lead`, then links the operator and builder
    // between `lead` and `rest`.
    lead: "is a community-led rental listing platform connecting housing navigators from social service organizations with affordable and accessible units from values-aligned housing providers. Co-created by",
    rest: ", the platform offers transparent listings—including pricing, accessibility features, and forms of income landlords will accept.",
    aimsIntro: "The platform aims to:",
    aims: [
      "Streamline the search for affordable and accessible housing units.",
      "Rent accessible and affordable units to tenants who most benefit from their features.",
    ],
  },
  scope: {
    is: [
      `A listing website for affordable and accessible units in ${siteConfig.region}—think Realtor.ca for specific types of units.`,
      "Free to join",
      "For use by housing navigators, case workers, social support organizations",
      "For use by understanding and flexible housing providers—who are often willing to collaborate with support organizations and tenants in a variety of ways to ensure a stable housing situation.",
    ],
    isNot: [
      "Intended as an alternative to CHAC or the PATHS List.",
      "Providing direct support, referrals, or guidance to find appropriate housing.",
      "A mediator between organizations, individuals and housing providers.",
      "Open to the public.",
    ],
  },
  access: `${siteConfig.name} is invitation-only while we onboard our first cohort of navigators and providers. Please reach out if you would like to learn more about ${siteConfig.name}.`,
};
