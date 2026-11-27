import { Unlink01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { AccountActivationFlow } from "@/components/auth/AccountActivationFlow";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
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
    <AuthPageShell>
      <AuthCard
        icon={Unlink01Icon}
        title="Invite unavailable"
        description="This invite link is missing, expired, or has already been used."
        footer={
          <>
            <Button asChild size="lg" className="w-full">
              <Link href="/sign-in">Go to sign in</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Need a new invite?{" "}
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="font-medium text-primary-text underline-offset-4 hover:underline"
              >
                Contact us
              </a>
            </p>
          </>
        }
      />
    </AuthPageShell>
  );
}
