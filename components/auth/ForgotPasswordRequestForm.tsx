"use client";

import { useActionState } from "react";

import { type ForgotPasswordState, requestPasswordResetAction } from "@/app/forgot-password/actions";
import { AuthCard } from "@/components/auth/AuthCard";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ForgotPasswordState = {
  error: "",
  success: "",
};

export function ForgotPasswordRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={action}>
      <AuthCard
        title="Forgot password"
        description="Enter your account email and we will send you a reset link."
        footer={
          <Button type="submit" size="sm" className="rounded-full px-4" disabled={pending}>
            {pending ? "Sending..." : "Send reset link"}
          </Button>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-foreground">
            Email
          </label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        {state.error ? (
          <AlertBanner variant="error" size="sm">
            {state.error}
          </AlertBanner>
        ) : null}

        {state.success ? (
          <AlertBanner variant="success" size="sm">
            {state.success}
          </AlertBanner>
        ) : null}
      </AuthCard>
    </form>
  );
}