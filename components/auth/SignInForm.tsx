"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInWithPassword } from "@/app/sign-in/actions";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = {
  error: "",
};

type SignInFormProps = {
  callbackUrl: string;
};

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const [state, action, pending] = useActionState(signInWithPassword, initialState);

  return (
    <form action={action}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <AuthCard
        title="Sign in"
        description="Use the email address that was invited to the portal."
        footer={
          <Button type="submit" size="sm" className="rounded-full px-4" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-foreground">
            Email
          </label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      </AuthCard>
    </form>
  );
}
