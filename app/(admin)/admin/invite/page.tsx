import type { Metadata } from "next";

import verbiage from "@/content/verbiage.json";
import { buildInviteRecordFromAccountInvite } from "@/components/admin-invite/invite-records";
import { AdminInvitePanel } from "@/components/admin-invite/AdminInvitePanel";
import { AppPageShell, PageHeader, pageWidths } from "@/components/page-shell/AppPageShell";
import { BackLink } from "@/components/ui/back-link";
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
      <div className={cn("mx-auto space-y-6", pageWidths.content)}>
        <div className="space-y-2">
          <BackLink href="/admin/users">Users</BackLink>
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
