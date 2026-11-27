"use client";

import { useDeferredValue, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { AccountTableColumns } from "@/components/admin-users/AccountTableColumns";
import { ManageAccountDialog } from "@/components/admin-users/ManageAccountDialog";
import {
  accountStatusLabels,
  accountStatusTones,
  formatAccountDate,
  type AccountListItem,
  type AccountStatus,
} from "@/components/admin-users/account-display";
import { RoleLabel } from "@/components/admin-invite/RoleLabel";
import { inviteRoleOptions, type InviteRole } from "@/components/admin-invite/types";
import { StatusLabel } from "@/components/ui/badge";
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
import { OrganizationLine } from "./OrganizationLine";

const PAGE_SIZE = 25;

function DateText({ value }: { value: string | null }) {
  const date = formatAccountDate(value);
  return (
    <span className="whitespace-nowrap" title={date.full}>
      {date.short}
    </span>
  );
}

function AccountStatusText({ status }: { status: AccountStatus | null }) {
  if (!status) return <StatusLabel tone="neutral">Unknown</StatusLabel>;
  return <StatusLabel tone={accountStatusTones[status]}>{accountStatusLabels[status]}</StatusLabel>;
}

function accountName(account: AccountListItem) {
  return account.name ?? account.email ?? "Unnamed user";
}

/** The name opens the manage dialog for keyboard and screen reader users; the row does for pointers. */
function ManageButton({ account, onManage }: { account: AccountListItem; onManage: () => void }) {
  return (
    <button
      type="button"
      className="max-w-full truncate rounded-sm text-left font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      onClick={(event) => {
        event.stopPropagation();
        onManage();
      }}
    >
      <span className="sr-only">Manage </span>
      {accountName(account)}
    </button>
  );
}

function RowChevron() {
  return (
    <HugeiconsIcon
      icon={ArrowRight01Icon}
      strokeWidth={2}
      className="size-4 shrink-0 text-muted-foreground"
      aria-hidden
    />
  );
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
  // Kept as an id so the open dialog picks up the refreshed account after a save.
  const [managingId, setManagingId] = useState<string | null>(null);
  const managing = accounts.find((account) => account.id === managingId);
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
              <AccountTableColumns />
              <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last sign-in</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Manage</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((account) => (
                  <tr
                    key={account.id}
                    // Top-aligned like the invitations table, so the two line up.
                    className="cursor-pointer align-top transition-colors hover:bg-muted"
                    onClick={() => setManagingId(account.id)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 flex-col">
                        <ManageButton
                          account={account}
                          onManage={() => setManagingId(account.id)}
                        />
                        <span
                          className="truncate text-sm text-muted-foreground"
                          title={account.email ?? undefined}
                        >
                          {account.email ?? "No email"}
                        </span>
                        {account.organization ? (
                          <OrganizationLine
                            organization={account.organization}
                            className="mt-0.5"
                          />
                        ) : null}
                      </div>
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
                    <td className="py-2.5 pr-3">
                      {/* Sized like the invitations' menu button so the two columns line up. */}
                      <div className="ml-auto flex size-10 items-center justify-center">
                        <RowChevron />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y lg:hidden">
            {visible.map((account) => (
              <li
                key={account.id}
                className="flex min-w-0 cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                onClick={() => setManagingId(account.id)}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <ManageButton account={account} onManage={() => setManagingId(account.id)} />
                  <span
                    className="truncate text-sm text-muted-foreground"
                    title={account.email ?? undefined}
                  >
                    {account.email ?? "No email"}
                  </span>
                  {account.organization ? (
                    <OrganizationLine organization={account.organization} />
                  ) : null}
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm text-muted-foreground">
                    {account.role ? <RoleLabel role={account.role} /> : null}
                    <AccountStatusText status={account.status} />
                  </p>
                </div>
                <RowChevron />
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
      {managing ? (
        <ManageAccountDialog
          key={managing.id}
          account={managing}
          onClose={() => setManagingId(null)}
        />
      ) : null}
    </Card>
  );
}
