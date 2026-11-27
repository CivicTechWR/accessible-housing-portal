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
      title="Community agreement and terms of use"
      description={`Read the agreement below, then confirm to continue setting up your ${siteConfig.name} account.`}
      className="max-w-3xl"
    >
      <CommunityAgreementTerms showClosing={false} />

      {/* Stays at the bottom of the screen while the terms scroll past, so the next step is
          always in view. */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background px-4 py-3 sm:-mx-8 sm:-mb-8 sm:rounded-b-xl sm:bg-card sm:px-8 sm:py-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="community-agreement"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
          />
          <div>
            <label htmlFor="community-agreement" className="text-base leading-snug font-medium">
              I agree to the terms above
            </label>
            {!agreed ? (
              <p id="community-agreement-hint" className="text-sm text-muted-foreground">
                Tick the box to continue.
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          className="shrink-0"
          disabled={!agreed}
          aria-describedby={agreed ? undefined : "community-agreement-hint"}
          onClick={onAccept}
        >
          Continue
        </Button>
      </div>
    </AuthCard>
  );
}
