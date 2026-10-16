"use client";

import { useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { CommunityAgreementTerms } from "@/components/community-agreement/CommunityAgreementTerms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type CommunityAgreementProps = {
  onAccept: () => void;
};

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
        <CommunityAgreementTerms />
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
