import Link from "next/link";
import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ResetPasswordWithTokenForm } from "@/components/auth/ResetPasswordWithTokenForm";
import { Button } from "@/components/ui/button";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Reset Password | WR Housing Bridge",
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const tokenValue = resolvedSearchParams.token;
  const token = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue;

  if (!token) {
    return <InvalidResetState />;
  }

  return (
    <AuthPageShell>
      <ResetPasswordWithTokenForm token={token} />
    </AuthPageShell>
  );
}

function InvalidResetState() {
  return (
    <AuthPageShell variant="default">
      <AuthCard
        title="Reset link unavailable"
        description="This reset link is missing or invalid. Request a new reset email to continue."
      >
        <div className="pt-0">
          <Button asChild size="sm" className="rounded-full px-4">
            <Link href="/forgot-password">Request reset link</Link>
          </Button>
        </div>
      </AuthCard>
    </AuthPageShell>
  );
}