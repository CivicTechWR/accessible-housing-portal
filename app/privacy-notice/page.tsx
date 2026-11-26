import type { Metadata } from "next";

import { PrivacyNoticeContent } from "@/components/privacy-notice/PrivacyNoticeContent";
import { privacyNotice } from "@/content/privacy-notice";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: `How ${siteConfig.name} collects, uses, stores, and protects personal information.`,
};

export default function PrivacyNoticePage() {
  return (
    <main className="bg-background px-6 py-10 sm:py-16">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3 border-b border-border pb-6">
          <p className="text-sm text-muted-foreground">{privacyNotice.subtitle}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {privacyNotice.title}
          </h1>
          {privacyNotice.lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {privacyNotice.lastUpdated}
            </p>
          )}
        </header>
        <PrivacyNoticeContent notice={privacyNotice} />
      </article>
    </main>
  );
}
