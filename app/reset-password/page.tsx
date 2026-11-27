import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
        <AuthCard
          title="Link unavailable"
          description="This reset link is missing, expired, or has already been used. Request a new one."
          footer={
            <Button asChild size="lg" className="w-full">
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
          }
        />
      )}
    </AuthPageShell>
  );
}
