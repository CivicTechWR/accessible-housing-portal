"use client";

import { useActionState } from "react";

import { type ManageAccountState, resetPasswordAction } from "@/app/manage-account/actions";
import { AuthCard } from "@/components/auth/AuthCard";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ManageAccountState = {};

type ManageAccountPasswordFormProps = {
  email: string;
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

export function ManageAccountPasswordForm({ email }: ManageAccountPasswordFormProps) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);

  const describedBy = (field: keyof NonNullable<ManageAccountState["fieldErrors"]>) =>
    state.fieldErrors?.[field]?.length ? `${field}-error` : undefined;

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
            aria-invalid={Boolean(state.fieldErrors?.currentPassword?.length)}
            aria-describedby={describedBy("currentPassword")}
          />
          <FieldError fieldId="currentPassword" messages={state.fieldErrors?.currentPassword} />
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
