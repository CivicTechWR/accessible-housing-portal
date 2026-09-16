"use client";

import { useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type CommunityAgreementProps = {
  onAccept: () => void;
};

const agreementSections = [
  {
    title: "1. What You Can Expect From Us",
    items: [
      {
        title: "Best Effort Access",
        body: "As a prototype platform, we are continuously testing and improving. We do our absolute best to maintain platform availability, security, and accessibility for all users.",
      },
      {
        title: "Minimal Data Collection",
        body: "We respect your privacy and only collect the minimal personal information necessary to run the service.",
      },
      {
        title: "Open Connection",
        body: "For housing providers, please keep in mind that contact information shared on your public profile or listings may be used by housing seekers looking to connect with you directly.",
      },
      {
        title: "Co-Building & Feedback",
        body: "As an evolving prototype, you might spot bugs or features that could work better. We welcome your feedback, patience, and ideas as we co-build this tool together for our community.",
      },
    ],
  },
  {
    title: "2. Community Expectations (For Everyone)",
    items: [
      {
        title: "Good Faith",
        body: "We expect all housing seekers and providers to interact honestly, respectfully, and in good faith.",
      },
      {
        title: "Transparency",
        body: "Providers are encouraged to be clear, upfront, and accurate about unit features, pricing, accessibility attributes, and application steps. Housing seekers are encouraged to represent themselves and those they are supporting honestly and respectfully.",
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
    title: "3. Understanding Our Role & Disclaimers",
    items: [
      {
        title: "Our Role",
        body: "We provide the digital space and tools to help providers and seekers connect. We are not a landlord, property manager, legal agent, or tenant advocate. Any tenancy agreements or lease arrangements are strictly between the housing provider and the housing seeker.",
      },
      {
        title: "Keeping Info Current",
        body: "You are responsible for keeping your login credentials safe and ensuring your profile and contact details remain accurate so people can reach you.",
      },
      {
        title: "No Guarantee of Housing",
        body: "Registering, searching, or applying on the platform does not guarantee housing placement or a lease agreement. The platform is a matching and discovery tool, but final housing decisions rest entirely with individual housing providers.",
      },
    ],
  },
] as const;

export function CommunityAgreement({ onAccept }: CommunityAgreementProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <AuthCard
      title="Community Agreement & Terms of Use"
      description="Home Hub Platform"
      className="max-w-3xl"
      footer={
        <Button type="button" disabled={!agreed} onClick={onAccept}>
          Agree and continue
        </Button>
      }
    >
      <div
        className="max-h-[55vh] space-y-6 overflow-y-auto pr-3 text-sm leading-6"
        aria-label="Community agreement terms"
        tabIndex={0}
      >
        <p>
          Welcome! We are excited to have you here. Home Hub is a prototype built to connect
          community members with affordable, supportive, and accessible housing. By registering, you
          agree to join our community network with the following shared expectations and guidelines
          in mind.
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

      <div className="flex items-start gap-3 border-t border-border/60 pt-4">
        <Checkbox
          id="community-agreement"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
        />
        <label htmlFor="community-agreement" className="text-sm leading-5">
          I have read and agree to the Community Agreement & Terms of Use.
        </label>
      </div>
    </AuthCard>
  );
}
