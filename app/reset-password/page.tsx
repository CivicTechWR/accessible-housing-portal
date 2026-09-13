import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import Link from "next/link";
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <AuthPageShell>
      {token && !error ? (
        <AcceptInviteForm token={token} />
      ) : (
        <AuthCard title="Link unavailable" description="Request a new password reset link.">
          <Link href="/forgot-password" className="underline">
            Request a reset
          </Link>
        </AuthCard>
      )}
    </AuthPageShell>
  );
}
