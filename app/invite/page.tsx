import Link from "next/link";

import { AccountActivationFlow } from "@/components/auth/AccountActivationFlow";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { getPendingInviteByToken } from "@/lib/auth/invite-store";

type InvitePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const resolvedSearchParams = await searchParams;
  const tokenValue = resolvedSearchParams.token;
  const token = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue;

  if (!token) {
    return <InvalidInviteState />;
  }

  const invite = await getPendingInviteByToken(token);

  if (!invite) {
    return <InvalidInviteState />;
  }

  return (
    <AuthPageShell>
      <AccountActivationFlow token={token} email={invite.user.email} />
    </AuthPageShell>
  );
}

function InvalidInviteState() {
  return (
    <AuthPageShell variant="default">
      <AuthCard
        title="Invite unavailable"
        description="This invite link is missing, expired, or has already been used."
      >
        <div className="pt-0">
          <Button asChild size="sm" className="rounded-full px-4">
            <Link href="/sign-in">Go to sign in</Link>
          </Button>
        </div>
      </AuthCard>
    </AuthPageShell>
  );
}
