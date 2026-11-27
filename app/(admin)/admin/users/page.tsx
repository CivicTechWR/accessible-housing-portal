import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

import { AdminInviteActions } from "@/components/admin-users/AdminInviteActions";
import { UserDirectory } from "@/components/admin-users/UserDirectory";
import { StatusDot, type StatusTone } from "@/components/admin-users/StatusDot";
import { formatAccountDate } from "@/components/admin-users/account-display";
import { RoleBadge } from "@/components/admin-invite/RoleBadge";
import { InviteEmailStatusSummary } from "@/components/admin-invite/InviteEmailStatusSummary";
import {
  AppPageShell,
  PageHeader,
  PageMessage,
  pageWidths,
} from "@/components/page-shell/AppPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { findAccountInvites, type AccountInviteRow } from "@/lib/auth/invite-store";
import { getAccountsService } from "@/lib/accounts/account.service";
import { cn } from "@/lib/utils";
import type { AccountListResponse } from "@/shared/schemas/account-management";

export const metadata: Metadata = {
  title: "Users",
};

export const dynamic = "force-dynamic";

const pageLimit = 100;

async function getAllAccounts() {
  const firstPageResult = await getAccountsService({
    page: "1",
    limit: pageLimit.toString(),
  });

  if (!firstPageResult.ok) {
    return firstPageResult;
  }

  const firstPage = firstPageResult.value;

  if (firstPage.pagination.totalPages <= 1) {
    return {
      ok: true as const,
      value: firstPage,
    };
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
      getAccountsService({
        page: (index + 2).toString(),
        limit: pageLimit.toString(),
      }),
    ),
  );

  const failedPage = remainingPages.find((result) => !result.ok);

  if (failedPage && !failedPage.ok) {
    return failedPage;
  }

  const data = [
    ...firstPage.data,
    ...remainingPages.flatMap((result) => (result.ok ? result.value.data : [])),
  ];

  return {
    ok: true as const,
    value: {
      data,
      pagination: {
        ...firstPage.pagination,
        limit: data.length,
      },
    } satisfies AccountListResponse,
  };
}

const inviteLifecycle: Record<AccountInviteRow["lifecycle"], { label: string; tone: StatusTone }> =
  {
    pending: { label: "Pending", tone: "warning" },
    accepted: { label: "Accepted", tone: "success" },
    expired: { label: "Expired", tone: "neutral" },
    revoked: { label: "Revoked", tone: "neutral" },
  };

function InviteStatus({ lifecycle }: { lifecycle: AccountInviteRow["lifecycle"] }) {
  const { label, tone } = inviteLifecycle[lifecycle];
  return <StatusDot tone={tone}>{label}</StatusDot>;
}

function DateText({ value }: { value: Date }) {
  const date = formatAccountDate(value);
  return (
    <span className="whitespace-nowrap" title={date.full}>
      {date.short}
    </span>
  );
}

function SectionHeading({ id, title, count }: { id: string; title: string; count: number }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg">
      {title}
      <Badge variant="secondary">{count}</Badge>
    </h2>
  );
}

function Invitations({ invites }: { invites: AccountInviteRow[] }) {
  if (invites.length === 0) {
    return (
      <Card className="py-0">
        <EmptyState className="border-0">No invitations found.</EmptyState>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">Invitations</caption>
          <colgroup>
            <col />
            <col className="w-44" />
            <col className="w-[30%]" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-20" />
          </colgroup>
          <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Invitee</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Invited</th>
              <th className="px-4 py-2.5 font-medium">Expires</th>
              <th className="px-4 py-2.5 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invites.map((invite) => (
              <tr key={invite.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="truncate font-medium text-foreground">{invite.name}</p>
                  <p className="truncate text-xs text-muted-foreground" title={invite.email}>
                    {invite.email}
                  </p>
                  {invite.organization ? (
                    <p className="truncate text-xs text-muted-foreground">{invite.organization}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={invite.role} />
                </td>
                <td className="space-y-2 px-4 py-3">
                  <div>
                    <InviteStatus lifecycle={invite.lifecycle} />
                  </div>
                  {invite.emailStatus && <InviteEmailStatusSummary status={invite.emailStatus} />}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <DateText value={invite.invitedAt} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <DateText value={invite.expiresAt} />
                </td>
                <td className="px-4 py-3">
                  <AdminInviteActions
                    inviteId={invite.id}
                    inviteeLabel={invite.name || invite.email}
                    available={invite.lifecycle === "pending" && invite.canResend}
                    canResend={invite.canResend}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y lg:hidden">
        {invites.map((invite) => (
          <li key={invite.id} className="flex min-w-0 items-start gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="truncate font-medium text-foreground">{invite.name}</p>
              <p className="truncate text-sm text-muted-foreground">{invite.email}</p>
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <RoleBadge role={invite.role} />
                <InviteStatus lifecycle={invite.lifecycle} />
              </div>
              {invite.emailStatus && (
                <InviteEmailStatusSummary status={invite.emailStatus} className="pt-1" />
              )}
              <p className="text-xs text-muted-foreground">
                Invited <DateText value={invite.invitedAt} /> · Expires{" "}
                <DateText value={invite.expiresAt} />
              </p>
            </div>
            <AdminInviteActions
              inviteId={invite.id}
              inviteeLabel={invite.name || invite.email}
              available={invite.lifecycle === "pending" && invite.canResend}
              canResend={invite.canResend}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function AdminUsersPage() {
  const result = await getAllAccounts();

  if (!result.ok) {
    return <PageMessage title="Unable to load users">{result.error.message}</PageMessage>;
  }

  // Loaded only after `getAllAccounts` has confirmed an administrator.
  const invites = await findAccountInvites();
  const accounts = result.value.data;

  return (
    <AppPageShell>
      <div className={cn("mx-auto space-y-8", pageWidths.wide)}>
        <PageHeader
          title="Users"
          description="Review portal accounts, their access levels and recent activity."
          actions={
            <Button asChild>
              <Link href="/admin/invite">
                <HugeiconsIcon
                  icon={Add01Icon}
                  strokeWidth={2}
                  data-icon="inline-start"
                  aria-hidden
                />
                Invite user
              </Link>
            </Button>
          }
        />

        <section className="space-y-3" aria-labelledby="invitations-heading">
          <SectionHeading id="invitations-heading" title="Invitations" count={invites.length} />
          <Invitations invites={invites} />
        </section>

        <section className="space-y-3" aria-labelledby="directory-heading">
          <SectionHeading id="directory-heading" title="All users" count={accounts.length} />
          <UserDirectory accounts={accounts} />
        </section>
      </div>
    </AppPageShell>
  );
}
