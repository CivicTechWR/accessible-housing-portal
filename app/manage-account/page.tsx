import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth/session";
import { AccountSecurity } from "@/components/auth/AccountSecurity";
import { AppPageShell, PageHeader, pageWidths } from "@/components/page-shell/AppPageShell";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Manage account",
};

export default async function ManageAccountPage() {
  const { session } = await getOptionalSession();
  if (!session) redirect("/sign-in?callbackUrl=/manage-account");
  return (
    <AppPageShell>
      {/* A single column of cards on phones; from lg, settings rows with their titles on the left. */}
      <div className={cn("mx-auto space-y-6 lg:max-w-5xl", pageWidths.form)}>
        <PageHeader
          title="Manage account"
          description={
            <>
              Signed in as <span className="font-medium text-foreground">{session.user.email}</span>
            </>
          }
        />
        <AccountSecurity />
      </div>
    </AppPageShell>
  );
}
