"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { AuthCard, AuthField } from "@/components/auth/AuthCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim().toLowerCase();
    setPending(true);
    try {
      const result = await authClient.requestPasswordReset({ email });
      setMessage(
        result.error
          ? (result.error.message ?? "Unable to request a reset.")
          : "If an account matches that address, we'll email you a reset link.",
      );
    } catch {
      setMessage("Unable to request a reset. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="w-full max-w-[400px]" onSubmit={submit}>
      <AuthCard
        title="Forgot password?"
        description="We'll email you a link that expires in one hour."
        footer={
          <>
            <Button className="w-full" size="lg" disabled={pending}>
              {pending ? "Please wait..." : "Send reset link"}
            </Button>
            <Link
              href="/sign-in"
              className="block text-center text-sm font-medium text-primary-text underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </>
        }
      >
        <AuthField>
          <label htmlFor="email">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </AuthField>
        {message && (
          <p role="status" className="rounded-lg bg-muted px-4 py-3 text-sm">
            {message}
          </p>
        )}
      </AuthCard>
    </form>
  );
}
