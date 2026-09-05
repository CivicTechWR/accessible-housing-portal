"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [secondFactor, setSecondFactor] = useState(false);
  const [backupCode, setBackupCode] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (secondFactor) {
        const code = String(form.get("code"));
        const result = backupCode
          ? await authClient.twoFactor.verifyBackupCode({ code })
          : await authClient.twoFactor.verifyTotp({ code });
        if (result.error) setError(result.error.message ?? "Unable to verify code.");
        else window.location.assign(callbackUrl);
      } else {
        const result = await authClient.signIn.email({
          email: String(form.get("email")).trim().toLowerCase(),
          password: String(form.get("password")),
        });
        if (result.error) setError(result.error.message ?? "Unable to sign in.");
        else if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect)
          setSecondFactor(true);
        else window.location.assign(callbackUrl);
      }
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function signInWithPasskey() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.passkey();
      if (result.error)
        setError(
          ("code" in result.error &&
            (result.error.code === "AUTH_CANCELLED" ||
              result.error.code === "ERROR_CEREMONY_ABORTED")) ||
            result.error.message === "Auth cancelled"
            ? "Sign-in cancelled."
            : "Passkey sign-in wasn't completed. You can try again.",
        );
      else window.location.assign(callbackUrl);
    } catch {
      setError("Passkey sign-in wasn't completed. You can try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <AuthCard
        title={secondFactor ? "Verify your sign-in" : "Sign in"}
        description={secondFactor ? "Enter a code to finish signing in." : undefined}
        footer={
          <div className="w-full space-y-4">
            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? "Please wait..." : secondFactor ? "Verify" : "Sign in"}
            </Button>
            {!secondFactor && (
              <div className="border-t border-border/60 pt-4">
                <Button
                  className="w-full"
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={signInWithPasskey}
                >
                  Sign in with a passkey
                </Button>
              </div>
            )}
          </div>
        }
      >
        {secondFactor ? (
          <>
            <label htmlFor="code">{backupCode ? "Recovery code" : "Authenticator code"}</label>
            <Input
              id="code"
              name="code"
              autoComplete="one-time-code"
              inputMode={backupCode ? "text" : "numeric"}
              required
            />
            <Button type="button" variant="link" onClick={() => setBackupCode(!backupCode)}>
              {backupCode ? "Use authenticator app" : "Use a recovery code"}
            </Button>
          </>
        ) : (
          <>
            <label htmlFor="email">Email</label>
            <Input id="email" name="email" type="email" autoComplete="username webauthn" required />
            <label htmlFor="password">Password</label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <Link className="block text-right text-sm underline" href="/forgot-password">
              Forgot password?
            </Link>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </AuthCard>
    </form>
  );
}
