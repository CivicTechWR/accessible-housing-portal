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
    >
      <CommunityAgreementTerms />

      {/* Stays at the bottom of the screen while the terms scroll past, so the next step is
          always in view. */}
      <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col gap-4 rounded-b-xl border-t bg-card px-6 py-5 sm:-mx-8 sm:-mb-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-start gap-3">
          <Checkbox
            id="community-agreement"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
          />
          <label htmlFor="community-agreement" className="text-base leading-6 font-medium">
            I have read and agree to the Community Agreement & Terms of Use.
          </label>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full shrink-0 sm:w-auto"
          disabled={!agreed}
          onClick={onAccept}
        >
          Agree and continue
        </Button>
      </div>
    </AuthCard>
  );
}
