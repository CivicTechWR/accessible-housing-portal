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

const initialState: ResetPasswordWithTokenState = {
  error: "",
  success: "",
};

type ResetPasswordWithTokenFormProps = {
  token: string;
};

export function ResetPasswordWithTokenForm({ token }: ResetPasswordWithTokenFormProps) {
  const [state, action, pending] = useActionState(resetPasswordWithTokenAction, initialState);

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
          />
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