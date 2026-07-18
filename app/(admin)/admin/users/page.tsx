import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppPageShell, PageMessage } from "@/components/page-shell/AppPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { findPendingAccountInvites, type PendingAccountInviteRow } from "@/lib/auth/invite-store";
import { inviteStatusLabels } from "@/components/admin-invite/types";
import { getAccountsService } from "@/lib/accounts/account.service";
import { cn } from "@/lib/utils";
import type { AccountListResponse } from "@/shared/schemas/account-management";

export const metadata: Metadata = {
  title: "Manage Users | WR Housing Bridge",
};

export const dynamic = "force-dynamic";

const pageLimit = 100;

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return dateTimeFormatter.format(new Date(value));
}

function roleBadgeVariant(role: AccountListResponse["data"][number]["role"]) {
  switch (role) {
    case "admin":
      return "default" as const;
    case "partner":
      return "secondary" as const;
    case "user":
      return "outline" as const;
  }
}

function inviteEmailBadgeVariant(status: PendingAccountInviteRow["status"]) {
  return status === "failed" ? ("destructive" as const) : ("outline" as const);
}

function statusBadgeVariant(status: AccountListResponse["data"][number]["status"]) {
  switch (status) {
    case "active":
      return "secondary" as const;
    case "invited":
      return "outline" as const;
    case "suspended":
      return "destructive" as const;
    case "deactivated":
      return "ghost" as const;
  }
}

function formatRole(role: AccountListResponse["data"][number]["role"]) {
  switch (role) {
    case "partner":
      return "Housing Lister";
    case "user":
      return "Housing Searcher";
    case "admin":
      return "Admin";
  }
}

function formatStatus(status: AccountListResponse["data"][number]["status"]) {
  switch (status) {
    case "active":
      return "Active";
    case "invited":
      return "Invited";
    case "suspended":
      return "Suspended";
    case "deactivated":
      return "Deactivated";
  }
}

function AdminDataSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b bg-background py-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
}

function DesktopDataTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function DesktopDataRow({ children }: { children: ReactNode }) {
  return <tr className="border-t border-border/80 align-top">{children}</tr>;
}

function DesktopDataCell({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <td className={cn("px-4 py-4", muted && "text-muted-foreground")}>{children}</td>;
}

function MobileDataList({ children }: { children: ReactNode }) {
  return <CardContent className="grid gap-4 p-4 lg:hidden">{children}</CardContent>;
}

function MobileDataCard({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-border bg-background p-4">{children}</div>;
}

function MobileDataHeader({
  title,
  subtitle,
  badges,
}: {
  title: string;
  subtitle: string;
  badges: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">{badges}</div>
    </div>
  );
}

function MobileDetails({ children }: { children: ReactNode }) {
  return <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{children}</dl>;
}

function MobileDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{children}</dd>
    </div>
  );
}

export default async function AdminUsersPage() {
  const result = await getAllAccounts();
  const pendingInvites = await findPendingAccountInvites();

  if (!result.ok) {
    return <PageMessage title="Unable to load users">{result.error.message}</PageMessage>;
  }

  const accounts = result.value.data;

  return (
    <AppPageShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Manage Users</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Review all portal accounts, their access levels, and recent activity.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/admin/invite">Invite user</Link>
          </Button>
        </div>

        <AdminDataSection title="Pending invites">
          <DesktopDataTable
            columns={["Invitee", "Organization", "Role", "Status", "Invited", "Expires"]}
          >
            {pendingInvites.length > 0 ? (
              pendingInvites.map((invite) => (
                <DesktopDataRow key={invite.id}>
                  <DesktopDataCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{invite.name}</p>
                      <p className="text-xs text-muted-foreground">{invite.email}</p>
                    </div>
                  </DesktopDataCell>
                  <DesktopDataCell muted>{invite.organization ?? "Not provided"}</DesktopDataCell>
                  <DesktopDataCell>
                    <Badge variant={roleBadgeVariant(invite.role)}>{formatRole(invite.role)}</Badge>
                  </DesktopDataCell>
                  <DesktopDataCell>
                    <Badge variant={inviteEmailBadgeVariant(invite.status)}>
                      {inviteStatusLabels[invite.status]}
                    </Badge>
                  </DesktopDataCell>
                  <DesktopDataCell muted>
                    {formatDateTime(invite.invitedAt.toISOString())}
                  </DesktopDataCell>
                  <DesktopDataCell muted>
                    {formatDateTime(invite.expiresAt.toISOString())}
                  </DesktopDataCell>
                </DesktopDataRow>
              ))
            ) : (
              <tr className="border-t border-border/80">
                <td colSpan={6} className="px-4 py-8">
                  <EmptyState className="border-0 bg-transparent py-0">
                    No active invites found.
                  </EmptyState>
                </td>
              </tr>
            )}
          </DesktopDataTable>

          <MobileDataList>
            {pendingInvites.length > 0 ? (
              pendingInvites.map((invite) => (
                <MobileDataCard key={invite.id}>
                  <MobileDataHeader
                    title={invite.name}
                    subtitle={invite.email}
                    badges={
                      <>
                        <Badge variant={roleBadgeVariant(invite.role)}>
                          {formatRole(invite.role)}
                        </Badge>
                        <Badge variant={inviteEmailBadgeVariant(invite.status)}>
                          {inviteStatusLabels[invite.status]}
                        </Badge>
                      </>
                    }
                  />
                  <MobileDetails>
                    <MobileDetail label="Organization">
                      {invite.organization ?? "Not provided"}
                    </MobileDetail>
                    <MobileDetail label="Invited">
                      {formatDateTime(invite.invitedAt.toISOString())}
                    </MobileDetail>
                    <MobileDetail label="Expires">
                      {formatDateTime(invite.expiresAt.toISOString())}
                    </MobileDetail>
                  </MobileDetails>
                </MobileDataCard>
              ))
            ) : (
              <EmptyState>No active invites found.</EmptyState>
            )}
          </MobileDataList>
        </AdminDataSection>

        <AdminDataSection title="User directory">
          <DesktopDataTable
            columns={["User", "Organization", "Role", "Status", "Created", "Last login"]}
          >
            {accounts.map((account) => (
              <DesktopDataRow key={account.id}>
                <DesktopDataCell>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {account.name ?? account.email ?? "Unnamed user"}
                    </p>
                    <p className="text-xs text-muted-foreground">{account.email ?? "No email"}</p>
                  </div>
                </DesktopDataCell>
                <DesktopDataCell muted>{account.organization ?? "Not provided"}</DesktopDataCell>
                <DesktopDataCell>
                  <Badge variant={roleBadgeVariant(account.role)}>{formatRole(account.role)}</Badge>
                </DesktopDataCell>
                <DesktopDataCell>
                  <Badge variant={statusBadgeVariant(account.status)}>
                    {formatStatus(account.status)}
                  </Badge>
                </DesktopDataCell>
                <DesktopDataCell muted>
                  <div className="space-y-1">
                    <p>{formatDateTime(account.createdAt)}</p>
                    <p className="text-xs">Updated {formatDateTime(account.updatedAt)}</p>
                  </div>
                </DesktopDataCell>
                <DesktopDataCell muted>{formatDateTime(account.lastLoginAt)}</DesktopDataCell>
              </DesktopDataRow>
            ))}
          </DesktopDataTable>

          <MobileDataList>
            {accounts.map((account) => (
              <MobileDataCard key={account.id}>
                <MobileDataHeader
                  title={account.name ?? account.email ?? "Unnamed user"}
                  subtitle={account.email ?? "No email"}
                  badges={
                    <>
                      <Badge variant={roleBadgeVariant(account.role)}>
                        {formatRole(account.role)}
                      </Badge>
                      <Badge variant={statusBadgeVariant(account.status)}>
                        {formatStatus(account.status)}
                      </Badge>
                    </>
                  }
                />
                <MobileDetails>
                  <MobileDetail label="Organization">
                    {account.organization ?? "Not provided"}
                  </MobileDetail>
                  <MobileDetail label="Created">{formatDateTime(account.createdAt)}</MobileDetail>
                  <MobileDetail label="Updated">{formatDateTime(account.updatedAt)}</MobileDetail>
                  <MobileDetail label="Last login">
                    {formatDateTime(account.lastLoginAt)}
                  </MobileDetail>
                </MobileDetails>
              </MobileDataCard>
            ))}
          </MobileDataList>
        </AdminDataSection>
      </div>
    </AppPageShell>
  );
}
