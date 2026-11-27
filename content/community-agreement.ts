import { siteConfig } from "@/lib/site-config";

export const communityAgreement = {
  introduction: `Welcome! We are excited to have you here. ${siteConfig.name} is a platform built to connect community members with affordable, supportive, and accessible housing. By using ${siteConfig.name}, you join our community network with the following shared expectations and guidelines in mind.`,
  sections: [
    {
      title: "1. Community expectations (for everyone)",
      items: [
        {
          title: "Good faith",
          body: "We expect all housing navigators and providers to interact honestly, respectfully, and in good faith.",
        },
        {
          title: "Transparency",
          body: "Providers are encouraged to be clear, upfront, and accurate about unit features, pricing, accessibility attributes, and application steps. Housing navigators are encouraged to represent themselves and those they are supporting honestly and respectfully.",
        },
        {
          title: "Inclusive and fair access",
          body: "We are committed to a barrier-free housing search experience. All users agree to treat one another with dignity and respect. Discrimination, harassment, or bias based on race, disability, family status, income source, or background will not be tolerated.",
        },
        {
          title: "Our shared goal",
          body: "Every user agrees to focus on the common goal—helping arrange appropriate, stable housing for the community members who need it most and ensuring sustainable operations and relationships for housing providers. We are all committed to creating a fairer, more accessible community for everyone.",
        },
      ],
    },
    {
      title: "2. Understanding our role and disclaimers",
      items: [
        {
          title: "Our role",
          body: "We provide the digital space to help providers and navigators connect. We are not representing a housing navigator or housing provider. Any tenancy agreements or lease arrangements are strictly between the housing provider, the support organization and the tenant.",
        },
        {
          title: "Keeping info current",
          body: "You are responsible for keeping your login credentials safe and ensuring your profile and contact details remain accurate so people can reach you.",
        },
        {
          title: "No guarantee of housing or leasing",
          body: "Registering, searching, or applying on the platform does not guarantee housing placement or a lease agreement. The platform is a matching and discovery tool, but final housing decisions rest entirely with individual housing providers, support organizations, and tenants.",
        },
      ],
    },
    {
      title: "3. What you can expect from us",
      items: [
        {
          title: "Best effort access",
          body: "As a pilot platform, we are continuously testing and improving. We do our absolute best to maintain platform availability, security, and accessibility for all users.",
        },
        {
          title: "Minimal data collection",
          body: "We respect your privacy and only collect the minimal personal information necessary to run the service.",
        },
        {
          title: "Open connection",
          body: "For housing providers, please keep in mind that contact information shared on your platform profile or listings may be used by housing navigators looking to connect with you directly.",
        },
        {
          title: "Co-building and feedback",
          body: "As an evolving prototype, you might spot bugs or features that could work better. We welcome your feedback, patience, and ideas as we co-build this tool together for our community.",
          // Rendered as a link after the body.
          link: {
            text: "If you have feedback you can submit it through this form.",
            href: siteConfig.feedbackFormUrl,
          },
        },
      ],
    },
  ],
  closing: `By using ${siteConfig.name}, you accept these community guidelines and terms of use.`,
};
