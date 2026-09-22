"use client";

import { useState } from "react";

import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { CommunityAgreement } from "@/components/auth/CommunityAgreement";

type AccountActivationStep = "communityAgreement" | "accountSetup";

type AccountActivationFlowProps = {
  token: string;
  email: string;
};

export function AccountActivationFlow({ token, email }: AccountActivationFlowProps) {
  const [step, setStep] = useState<AccountActivationStep>("communityAgreement");

  switch (step) {
    case "communityAgreement":
      return <CommunityAgreement onAccept={() => setStep("accountSetup")} />;
    case "accountSetup":
      return <AcceptInviteForm token={token} email={email} />;
  }
}
