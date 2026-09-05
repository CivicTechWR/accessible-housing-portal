"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AcceptInviteForm({ token, email }: { token: string; email?: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== form.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await authClient.resetPassword({ token, newPassword: password });
      if (result.error) setError(result.error.message ?? "This link is unavailable.");
      else setDone(true);
    } catch {
      setError("Unable to set password. Please try again.");
    } finally {
      setPending(false);
    }
  }
  if (done)
    return (
      <AuthCard title="Password saved" description="Sign in with your new password to continue.">
        <Button asChild>
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </AuthCard>
    );
  return (
    <form onSubmit={submit}>
      <AuthCard
        title={email ? "Activate your account" : "Reset your password"}
        description={email}
        footer={
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save password"}
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">Use 12 to 128 characters.</p>
        <label htmlFor="password">New password</label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
        <label htmlFor="confirmPassword">Confirm password</label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </AuthCard>
    </form>
  );
}
