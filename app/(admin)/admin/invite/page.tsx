import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import verbiage from "@/content/verbiage.json";
import { buildInviteRecordFromAccountInvite } from "@/components/admin-invite/invite-records";
import { AdminInvitePanel } from "@/components/admin-invite/AdminInvitePanel";
import { AppPageShell, PageHeader, pageWidths } from "@/components/page-shell/AppPageShell";
import { Button } from "@/components/ui/button";
import { getRecentAccountInvitesService } from "@/lib/accounts/account.service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: verbiage.adminInvite.pageTitle,
  description: verbiage.adminInvite.pageDescription,
};

export const dynamic = "force-dynamic";

export default async function AdminInvitePage() {
  const result = await getRecentAccountInvitesService(8);
  const initialInvites = result.ok ? result.value.data.map(buildInviteRecordFromAccountInvite) : [];

  return (
    <AppPageShell>
      <div className={cn("mx-auto space-y-6", pageWidths.form)}>
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2.5 text-muted-foreground">
            <Link href="/admin/users">
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden
              />
              Users
            </Link>
          </Button>
          <PageHeader
            title={verbiage.adminInvite.heading}
            description={verbiage.adminInvite.subheading}
          />
        </div>
        <AdminInvitePanel initialInvites={initialInvites} shouldHydrateInvites={false} />
      </div>
    </AppPageShell>
  );
}
