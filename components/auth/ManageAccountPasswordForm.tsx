"use client";

import { useActionState } from "react";

import { type ManageAccountState, resetPasswordAction } from "@/app/manage-account/actions";
import { AuthCard } from "@/components/auth/AuthCard";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ManageAccountState = {
  error: "",
  success: "",
};

type ManageAccountPasswordFormProps = {
  email: string;
};

export function ManageAccountPasswordForm({ email }: ManageAccountPasswordFormProps) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={action}>
      <AuthCard
        title="Reset password"
        description={email}
        footer={
          <Button type="submit" size="sm" className="rounded-full px-4" disabled={pending}>
            {pending ? "Saving..." : "Update password"}
          </Button>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="currentPassword" className="text-xs font-medium text-foreground">
            Current password
          </label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

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