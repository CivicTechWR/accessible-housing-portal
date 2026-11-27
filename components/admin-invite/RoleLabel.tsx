import { inviteRoleLabels, type InviteRole } from "@/components/admin-invite/types";
import { cn } from "@/lib/utils";

/**
 * A role as plain text. Every account has a role, so a chip or icon on each row would only add
 * noise; chips are kept for statuses that need attention.
 */
export function RoleLabel({ role, className }: { role: InviteRole; className?: string }) {
  return <span className={cn("text-sm text-foreground", className)}>{inviteRoleLabels[role]}</span>;
}
