"use client";

import verbiage from "@/content/verbiage.json";
import { AdminInviteForm } from "@/components/admin-invite/AdminInviteForm";
import { InviteResultBanner } from "@/components/admin-invite/InviteResultBanner";
import { RecentInvitesList } from "@/components/admin-invite/RecentInvitesList";
import type { InviteRecord } from "@/components/admin-invite/types";
import { useAdminInvite } from "@/components/admin-invite/useAdminInvite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminInvitePanel({
  initialInvites,
  shouldHydrateInvites,
}: Readonly<{
  initialInvites?: InviteRecord[];
  shouldHydrateInvites?: boolean;
}>) {
  const copy = verbiage.adminInvite;
  const { invites, lastResult, handleInviteResult } = useAdminInvite({
    initialInvites,
    shouldHydrateInvites,
  });

  return (
    // The form takes the main column and recent invites sit beside it from lg.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg">{copy.formTitle}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <AdminInviteForm onResult={handleInviteResult} />
          <InviteResultBanner result={lastResult} />
        </CardContent>
      </Card>

      <RecentInvitesList invites={invites} />
    </div>
  );
}
