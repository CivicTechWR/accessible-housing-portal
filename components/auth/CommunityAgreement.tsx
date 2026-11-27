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
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-4 border-t bg-background px-4 py-5 sm:-mx-8 sm:-mb-8 sm:flex-row sm:items-center sm:justify-between sm:rounded-b-xl sm:bg-card sm:px-8">
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
        <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!agreed}
            aria-describedby={agreed ? undefined : "community-agreement-hint"}
            onClick={onAccept}
          >
            Agree and continue
          </Button>
          {!agreed ? (
            <p id="community-agreement-hint" className="text-sm text-muted-foreground">
              Tick the box to continue.
            </p>
          ) : null}
        </div>
      </div>
    </AuthCard>
  );
}
