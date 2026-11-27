import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon, Search01Icon, Shield01Icon } from "@hugeicons/core-free-icons";

import { inviteRoleLabels, type InviteRole } from "@/components/admin-invite/types";
import { cn } from "@/lib/utils";

const roleIcons = {
  admin: Shield01Icon,
  partner: Home01Icon,
  user: Search01Icon,
} as const;

/**
 * A role as plain text with its icon. Every account has a role, so a chip on each row would only
 * add noise; chips are kept for statuses that need attention.
 */
export function RoleLabel({ role, className }: { role: InviteRole; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-foreground", className)}>
      <HugeiconsIcon
        icon={roleIcons[role]}
        strokeWidth={2}
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      {inviteRoleLabels[role]}
    </span>
  );
}
