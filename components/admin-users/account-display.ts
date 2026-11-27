import type { AccountListResponse } from "@/shared/schemas/account-management";

export type AccountListItem = AccountListResponse["data"][number];
export type AccountStatus = NonNullable<AccountListItem["status"]>;

const shortDateFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const fullDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** A short date for table cells, with the full date and time for a title tooltip. */
export function formatAccountDate(value: string | Date | null) {
  if (!value) {
    return { short: "Never", full: undefined };
  }

  const date = new Date(value);
  return { short: shortDateFormatter.format(date), full: fullDateTimeFormatter.format(date) };
}

export const accountStatusLabels: Record<AccountStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
  deactivated: "Deactivated",
};

export const accountStatusVariants = {
  active: "secondary",
  invited: "outline",
  suspended: "destructive",
  deactivated: "ghost",
} as const satisfies Record<AccountStatus, string>;
