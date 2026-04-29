import type { Metadata } from "next";

import verbiage from "@/content/verbiage.json";
import { buildInviteRecordFromAccountInvite } from "@/components/admin-invite/invite-records";
import { AdminInvitePanel } from "@/components/admin-invite/AdminInvitePanel";
import { getRecentAccountInvitesService } from "@/lib/accounts/account.service";

export const metadata: Metadata = {
  title: verbiage.adminInvite.pageTitle,
  description: verbiage.adminInvite.pageDescription,
};

export const dynamic = "force-dynamic";

export default async function AdminInvitePage() {
  const result = await getRecentAccountInvitesService(8);
  const initialInvites = result.ok ? result.value.data.map(buildInviteRecordFromAccountInvite) : [];

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <AdminInvitePanel initialInvites={initialInvites} shouldHydrateInvites={false} />
    </main>
  );
}
