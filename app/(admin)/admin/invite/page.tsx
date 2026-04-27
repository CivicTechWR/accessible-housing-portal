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

async function getInitialInvites() {
  const result = await getRecentAccountInvitesService(8);

  if (!result.ok) {
    return [];
  }

  return result.value.data.map(buildInviteRecordFromAccountInvite);
}

export default async function AdminInvitePage() {
  const initialInvites = await getInitialInvites();

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <AdminInvitePanel initialInvites={initialInvites} shouldHydrateInvites={false} />
    </main>
  );
}
