import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon, Search01Icon, Shield01Icon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { inviteRoleLabels, type InviteRole } from "@/components/admin-invite/types";

// Each role has its own icon and fill, so listers and searchers can be told apart at a glance and
// without relying on color.
const roleStyles = {
  admin: { icon: Shield01Icon, className: "" },
  partner: {
    icon: Home01Icon,
    className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200",
  },
  user: { icon: Search01Icon, className: "border-border bg-background text-foreground" },
} as const;

export function RoleBadge({ role, className }: { role: InviteRole; className?: string }) {
  const style = roleStyles[role];
  return (
    <Badge
      variant={role === "admin" ? "default" : role === "user" ? "outline" : "secondary"}
      className={cn(style.className, className)}
    >
      <HugeiconsIcon icon={style.icon} strokeWidth={1.75} data-icon="inline-start" aria-hidden />
      {inviteRoleLabels[role]}
    </Badge>
  );
}
