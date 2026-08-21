"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  type ResetPasswordWithTokenState,
  resetPasswordWithTokenAction,
} from "@/app/reset-password/actions";
import { AuthCard } from "@/components/auth/AuthCard";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ResetPasswordWithTokenState = {};

type ResetPasswordWithTokenFormProps = {
  token: string;
};

function FieldError({ fieldId, messages }: { fieldId: string; messages?: string[] }) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <p id={`${fieldId}-error`} className="text-xs text-destructive">
      {messages[0]}
    </p>
  );
}

export function ResetPasswordWithTokenForm({ token }: ResetPasswordWithTokenFormProps) {
  const [state, action, pending] = useActionState(resetPasswordWithTokenAction, initialState);

  const describedBy = (field: keyof NonNullable<ResetPasswordWithTokenState["fieldErrors"]>) =>
    state.fieldErrors?.[field]?.length ? `${field}-error` : undefined;

  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <AuthCard
        title="Set a new password"
        description="Create a new password for your account."
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <Button asChild type="button" variant="ghost" size="sm" className="rounded-full px-4">
              <Link href="/sign-in">Back to sign in</Link>
            </Button>
            {state.success ? (
              <Button asChild size="sm" className="rounded-full px-4">
                <Link href="/sign-in">Sign in now</Link>
              </Button>
            ) : (
              <Button type="submit" size="sm" className="rounded-full px-4" disabled={pending}>
                {pending ? "Saving..." : "Update password"}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-xs font-medium text-foreground">
            New password
          </label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.newPassword?.length)}
            aria-describedby={describedBy("newPassword")}
          />
          <FieldError fieldId="newPassword" messages={state.fieldErrors?.newPassword} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmNewPassword" className="text-xs font-medium text-foreground">
            Confirm new password
          </label>
          <Input
            id="confirmNewPassword"
            name="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.confirmNewPassword?.length)}
            aria-describedby={describedBy("confirmNewPassword")}
          />
          <FieldError
            fieldId="confirmNewPassword"
            messages={state.fieldErrors?.confirmNewPassword}
          />
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
