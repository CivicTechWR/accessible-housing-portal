import { StatusBadge, type StatusTone } from "@/components/ui/badge";

type ListingStatus = "draft" | "published" | "archived";

const listingStatuses = {
  published: { label: "Published", tone: "success" },
  draft: { label: "Draft", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
} as const satisfies Record<ListingStatus, { label: string; tone: StatusTone }>;

/** A listing's status, shared by My listings and the listing editor's header. */
export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  const { label, tone } = listingStatuses[status];
  return (
    <StatusBadge tone={tone} className={className}>
      {label}
    </StatusBadge>
  );
}
