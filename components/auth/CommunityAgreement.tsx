"use client";

import { useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { CommunityAgreementTerms } from "@/components/community-agreement/CommunityAgreementTerms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { siteConfig } from "@/lib/site-config";

type CommunityAgreementProps = {
  onAccept: () => void;
};

export function CommunityAgreement({ onAccept }: CommunityAgreementProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <AuthCard
      title="Community Agreement & Terms of Use"
      description={`Read the agreement below, then confirm to continue setting up your ${siteConfig.name} account.`}
      className="max-w-3xl"
      footer={
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={!agreed}
          onClick={onAccept}
        >
          Agree and continue
        </Button>
      }
    >
      <div className="relative rounded-xl border bg-background">
        <div
          className="max-h-[50vh] overflow-y-auto px-5 py-5 focus-visible:outline-2 focus-visible:outline-ring sm:px-6 [&_p.text-lg]:text-base [&_p.text-lg]:leading-7"
          aria-label="Community agreement terms"
          tabIndex={0}
        >
          <CommunityAgreementTerms />
        </div>
        {/* Hints that the terms continue below the fold. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-xl bg-linear-to-t from-background to-transparent"
        />
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-muted/60 px-4 py-4">
        <Checkbox
          id="community-agreement"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
        />
        <label htmlFor="community-agreement" className="text-base leading-6 font-medium">
          I have read and agree to the Community Agreement & Terms of Use.
        </label>
      </div>
    </AuthCard>
  );
}
