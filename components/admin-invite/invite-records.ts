import type { InviteRecord } from "@/components/admin-invite/types";
import type { AccountInviteListResponse } from "@/shared/schemas/account-management";

export function buildInviteRecordFromAccountInvite(
  invite: AccountInviteListResponse["data"][number],
): InviteRecord {
  return {
    id: invite.id,
    email: invite.email.trim().toLowerCase(),
    role: invite.role,
    invitedAt: invite.invitedAt,
    emailDelivery: invite.emailDelivery,
  };
}
