"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth/AuthCard";
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
    <form onSubmit={submit}>
      <AuthCard
        title="Forgot password?"
        description="We'll email you a link that expires in one hour."
        footer={
          <Button disabled={pending}>{pending ? "Please wait..." : "Send reset link"}</Button>
        }
      >
        <label htmlFor="email">Email</label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <Link className="text-sm underline" href="/sign-in">
          Back to sign in
        </Link>
      </AuthCard>
    </form>
  );
}
