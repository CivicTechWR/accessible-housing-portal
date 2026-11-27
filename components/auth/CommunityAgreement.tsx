"use client";

import { useRef, useState } from "react";

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
  const [showError, setShowError] = useState(false);
  const checkboxRef = useRef<HTMLButtonElement>(null);

  // Continue stays enabled, so it is always readable and focusable. Pressing it before agreeing
  // explains what is missing and moves focus to the checkbox.
  function handleContinue() {
    if (agreed) {
      onAccept();
      return;
    }
    setShowError(true);
    checkboxRef.current?.focus();
  }

  return (
    <AuthCard
      title="Community agreement and terms of use"
      description={`Read the agreement below, then confirm to continue setting up your ${siteConfig.name} account.`}
      className="max-w-3xl"
    >
      <CommunityAgreementTerms showClosing={false} />

      {/* Stays at the bottom of the screen while the terms scroll past, so the next step is
          always in view. The shadow separates it from the text scrolling underneath. */}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t bg-card px-4 py-3 shadow-[0_-8px_20px_-8px_rgb(0_0_0/0.12)] sm:-mx-8 sm:-mb-8 sm:flex-row sm:items-center sm:justify-between sm:rounded-b-xl sm:px-8 sm:py-4 dark:shadow-[0_-10px_24px_-8px_rgb(0_0_0/0.6)]">
        <div className="flex items-start gap-3">
          <Checkbox
            ref={checkboxRef}
            id="community-agreement"
            checked={agreed}
            aria-invalid={showError && !agreed ? true : undefined}
            aria-describedby={showError && !agreed ? "community-agreement-error" : undefined}
            onCheckedChange={(checked) => {
              setAgreed(checked === true);
              if (checked === true) setShowError(false);
            }}
            className="mt-0.5"
          />
          <div>
            <label htmlFor="community-agreement" className="text-base leading-snug font-medium">
              I agree to the community agreement
            </label>
            {showError && !agreed ? (
              <p id="community-agreement-error" role="alert" className="text-sm text-destructive">
                Tick the box to agree before continuing.
              </p>
            ) : null}
          </div>
        </div>
        <Button type="button" size="lg" className="shrink-0 max-sm:w-full" onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </AuthCard>
  );
}
