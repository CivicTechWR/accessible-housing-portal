import { siteConfig } from "@/lib/site-config";

export const homeContent = {
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
