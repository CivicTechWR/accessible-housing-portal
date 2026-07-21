import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ManageAccountPasswordForm } from "@/components/auth/ManageAccountPasswordForm";
import { AppPageShell } from "@/components/page-shell/AppPageShell";
import { getOptionalSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Manage Account | WR Housing Bridge",
};

export const dynamic = "force-dynamic";

export default async function ManageAccountPage() {
  const { session } = await getOptionalSession();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=%2Fmanage-account");
  }

  return (
    <AppPageShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Manage Account</h1>
          <p className="text-sm text-muted-foreground">
            Update your password to keep your account secure.
          </p>
        </div>
        <ManageAccountPasswordForm email={session.user.email ?? ""} />
      </div>
    </AppPageShell>
  );
}