"use client";

import { useState, type ReactNode } from "react";

import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { CommunityAgreement } from "@/components/auth/CommunityAgreement";

const accountActivationSteps = {
  communityAgreement: { number: 1, label: "Community agreement" },
  accountSetup: { number: 2, label: "Account setup" },
} as const;

type AccountActivationStep = keyof typeof accountActivationSteps;

type AccountActivationFlowProps = {
  token: string;
  email: string;
};

export function AccountActivationFlow({ token, email }: AccountActivationFlowProps) {
  const [step, setStep] = useState<AccountActivationStep>("communityAgreement");

  switch (step) {
    case "communityAgreement":
      return (
        <ActivationStep step="communityAgreement">
          <CommunityAgreement onAccept={() => setStep("accountSetup")} />
        </ActivationStep>
      );
    case "accountSetup":
      return (
        <ActivationStep step="accountSetup">
          <AcceptInviteForm token={token} email={email} />
        </ActivationStep>
      );
  }
}

function ActivationStep({ step, children }: { step: AccountActivationStep; children: ReactNode }) {
  const { number, label } = accountActivationSteps[step];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-md flex-col items-center gap-2">
        <div className="flex w-48 gap-2" aria-hidden="true">
          {[1, 2].map((n) => (
            <span
              key={n}
              className={
                n <= number
                  ? "h-2 flex-1 rounded-full bg-primary"
                  : "h-2 flex-1 rounded-full bg-border"
              }
            />
          ))}
        </div>
        <p className="text-base font-medium" aria-live="polite">
          Step {number} of 2: {label}
        </p>
      </div>
      {children}
    </div>
  );
}
