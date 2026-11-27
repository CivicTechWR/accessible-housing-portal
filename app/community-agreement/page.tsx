import type { Metadata } from "next";

import { CommunityAgreementTerms } from "@/components/community-agreement/CommunityAgreementTerms";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Community agreement and terms of use",
  description: `Community expectations and terms of use for the ${siteConfig.name} housing platform.`,
};

export default function CommunityAgreementPage() {
  return (
    <main className="bg-background px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-2xl space-y-10">
        <header className="space-y-3 border-b pb-8">
          <p className="text-sm font-medium text-primary-text">{siteConfig.name} platform</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Community agreement and terms of use
          </h1>
        </header>
        <CommunityAgreementTerms />
      </article>
    </main>
  );
}
