import type { Metadata } from "next";

import { CommunityAgreementTerms } from "@/components/community-agreement/CommunityAgreementTerms";

export const metadata: Metadata = {
  title: "Community Agreement & Terms of Use | Home Hub",
  description: "Community expectations and terms of use for the Home Hub housing platform.",
};

export default function CommunityAgreementPage() {
  return (
    <main className="bg-background px-6 py-10 sm:py-16">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3 border-b border-border pb-6">
          <p className="text-sm text-muted-foreground">Home Hub Platform</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Community Agreement & Terms of Use
          </h1>
        </header>
        <CommunityAgreementTerms />
      </article>
    </main>
  );
}
