const agreementSections = [
  {
    title: "1. Community Expectations (For Everyone)",
    items: [
      {
        title: "Good Faith",
        body: "We expect all housing navigators and providers to interact honestly, respectfully, and in good faith.",
      },
      {
        title: "Transparency",
        body: "Providers are encouraged to be clear, upfront, and accurate about unit features, pricing, accessibility attributes, and application steps. Housing navigators are encouraged to represent themselves and those they are supporting honestly and respectfully.",
      },
      {
        title: "Inclusive & Fair Access",
        body: "We are committed to a barrier-free housing search experience. All users agree to treat one another with dignity and respect. Discrimination, harassment, or bias based on race, disability, family status, income source, or background will not be tolerated.",
      },
      {
        title: "Our Shared Goal",
        body: "Every user agrees to focus on the common goal—helping arrange appropriate, stable housing for the community members who need it most and ensuring sustainable operations and relationships for housing providers. We are all committed to creating a fairer, more accessible community for everyone.",
      },
    ],
  },
  {
    title: "2. Understanding Our Role & Disclaimers",
    items: [
      {
        title: "Our Role",
        body: "We provide the digital space to help providers and navigators connect. We are not representing a housing navigator or housing provider. Any tenancy agreements or lease arrangements are strictly between the housing provider, the support organization and the tenant.",
      },
      {
        title: "Keeping Info Current",
        body: "You are responsible for keeping your login credentials safe and ensuring your profile and contact details remain accurate so people can reach you.",
      },
      {
        title: "No Guarantee of Housing or Leasing",
        body: "Registering, searching, or applying on the platform does not guarantee housing placement or a lease agreement. The platform is a matching and discovery tool, but final housing decisions rest entirely with individual housing providers, support organizations, and tenants.",
      },
    ],
  },
  {
    title: "3. What You Can Expect From Us",
    items: [
      {
        title: "Best Effort Access",
        body: "As a pilot platform, we are continuously testing and improving. We do our absolute best to maintain platform availability, security, and accessibility for all users.",
      },
      {
        title: "Minimal Data Collection",
        body: "We respect your privacy and only collect the minimal personal information necessary to run the service.",
      },
      {
        title: "Open Connection",
        body: "For housing providers, please keep in mind that contact information shared on your platform profile or listings may be used by housing navigators looking to connect with you directly.",
      },
      {
        title: "Co-Building & Feedback",
        body: (
          <>
            As an evolving prototype, you might spot bugs or features that could work better. We
            welcome your feedback, patience, and ideas as we co-build this tool together for our
            community.{" "}
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdmgdBsahBMIuU6AQngwArIKwCn_yJHZ299YtyT2FtT_FahCQ/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4"
            >
              If you have feedback you can submit it through this form.
            </a>
          </>
        ),
      },
    ],
  },
];

export function CommunityAgreementTerms() {
  return (
    <div className="space-y-6 text-sm leading-6">
      <p>
        Welcome! We are excited to have you here. Home Hub is a platform built to connect community
        members with affordable, supportive, and accessible housing. By registering, you agree to
        join our community network with the following shared expectations and guidelines in mind.
      </p>

      {agreementSections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
          <ul className="list-disc space-y-3 pl-5 text-muted-foreground">
            {section.items.map((item) => (
              <li key={item.title}>
                <span className="font-semibold text-foreground">{item.title}:</span> {item.body}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="font-medium text-foreground">
        By continuing to register, you accept these community guidelines and terms of use.
      </p>
    </div>
  );
}
