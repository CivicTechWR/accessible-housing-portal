import { Building03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

/**
 * An account's organization under its name and email, with a building icon so it doesn't read as
 * a third email-like line. One line, never broken at a hyphen ("Co-op").
 */
export function OrganizationLine({
  organization,
  className,
}: {
  organization: string;
  className?: string;
}) {
  return (
    <span
      className={cn("flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground", className)}
      title={organization}
    >
      <HugeiconsIcon
        icon={Building03Icon}
        strokeWidth={2}
        className="size-4 shrink-0"
        aria-hidden
      />
      <span className="truncate">{organization}</span>
    </span>
  );
}
