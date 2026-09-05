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
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold text-foreground">{copy.heading}</h1>
        <p className="text-sm text-muted-foreground">{copy.subheading}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{copy.formTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminInviteForm onResult={handleInviteResult} />
          <InviteResultBanner result={lastResult} />
        </CardContent>
      </Card>

      <RecentInvitesList invites={invites} />
    </section>
  );
}
