import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon, Search01Icon, Shield01Icon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { inviteRoleLabels, type InviteRole } from "@/components/admin-invite/types";

// Roles are neutral so colour stays reserved for status; the icon tells them apart.
const roleIcons = {
  admin: Shield01Icon,
  partner: Home01Icon,
  user: Search01Icon,
} as const;

export function RoleBadge({ role, className }: { role: InviteRole; className?: string }) {
  return (
    <Badge variant="outline" className={className}>
      <HugeiconsIcon
        icon={roleIcons[role]}
        strokeWidth={2}
        data-icon="inline-start"
        className="text-muted-foreground"
        aria-hidden
      />
      {inviteRoleLabels[role]}
    </Badge>
  );
}
