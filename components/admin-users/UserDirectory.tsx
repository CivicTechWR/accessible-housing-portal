"use client";

import { useDeferredValue, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { AdminAccountActions } from "@/components/admin-users/AdminAccountActions";
import {
  accountStatusLabels,
  accountStatusTones,
  formatAccountDate,
  type AccountListItem,
  type AccountStatus,
} from "@/components/admin-users/account-display";
import { RoleLabel } from "@/components/admin-invite/RoleLabel";
import { inviteRoleOptions, type InviteRole } from "@/components/admin-invite/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 25;

function DateText({ value }: { value: string | null }) {
  const date = formatAccountDate(value);
  return (
    <span className="whitespace-nowrap" title={date.full}>
      {date.short}
    </span>
  );
}

/** Active is the normal state, so it reads as plain text and only the exceptions get a chip. */
function AccountStatusText({ status }: { status: AccountStatus | null }) {
  if (!status) return <span className="text-sm text-muted-foreground">Unknown</span>;
  if (status === "active") {
    return <span className="text-sm text-foreground">{accountStatusLabels[status]}</span>;
  }
  return <StatusBadge tone={accountStatusTones[status]}>{accountStatusLabels[status]}</StatusBadge>;
}

function matchesSearch(account: AccountListItem, query: string) {
  if (!query) return true;
  return [account.name, account.email, account.organization].some((value) =>
    value?.toLowerCase().includes(query),
  );
}

/** The searchable, filterable list of every account. Filtering happens in the browser. */
export function UserDirectory({ accounts }: { accounts: AccountListItem[] }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<InviteRole | "all">("all");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [page, setPage] = useState(0);
  const query = useDeferredValue(search.trim().toLowerCase());

  const filtered = accounts.filter(
    (account) =>
      (role === "all" || account.role === role) &&
      (status === "all" || account.status === status) &&
      matchesSearch(account, query),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const firstShown = filtered.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const lastShown = currentPage * PAGE_SIZE + visible.length;
  const isFiltered = query !== "" || role !== "all" || status !== "all";

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
        <div className="relative md:flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search users"
            placeholder="Search name, email, organization"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <Select
            value={role}
            onValueChange={(value) => {
              setRole(value as InviteRole | "all");
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Filter by role" className="md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All roles</SelectItem>
              {inviteRoleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as AccountStatus | "all");
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Filter by status" className="md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(accountStatusLabels) as AccountStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {accountStatusLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-4">
          <EmptyState className="border-0">
            {isFiltered ? "No users match these filters." : "No users yet."}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="hidden lg:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <caption className="sr-only">Users</caption>
              <colgroup>
                <col />
                <col className="w-[18%]" />
                <col className="w-36" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-28" />
              </colgroup>
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last sign-in</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((account) => (
                  <tr key={account.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3.5">
                      <p className="font-medium break-words text-foreground">
                        {account.name ?? account.email ?? "Unnamed user"}
                      </p>
                      {/* Emails wrap at any character instead of truncating, so the whole
                          address stays readable. */}
                      <p className="text-xs [overflow-wrap:anywhere] text-muted-foreground">
                        {account.email ?? "No email"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 break-words text-foreground">
                      {account.organization ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {account.role ? <RoleLabel role={account.role} /> : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <AccountStatusText status={account.status} />
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      <DateText value={account.createdAt} />
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      <DateText value={account.lastLoginAt} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <AdminAccountActions account={account} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y lg:hidden">
            {visible.map((account) => (
              <li key={account.id} className="flex min-w-0 items-start gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate font-medium text-foreground">
                    {account.name ?? account.email ?? "Unnamed user"}
                  </p>
                  <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
                    {account.email ?? "No email"}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    {account.role ? <RoleLabel role={account.role} /> : null}
                    <AccountStatusText status={account.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {account.organization ? `${account.organization} · ` : null}
                    Last sign-in <DateText value={account.lastLoginAt} />
                  </p>
                </div>
                <AdminAccountActions account={account} />
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filtered.length === 0
            ? `0 of ${accounts.length} users`
            : `Showing ${firstShown}–${lastShown} of ${filtered.length} ${isFiltered ? "matching " : ""}users`}
        </p>
        {pageCount > 1 ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
