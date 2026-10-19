import type { UserRole, UserStatus } from "@/db/schema";

export type AccountActor = {
  userId: string;
  role: UserRole;
};

export function canManageAccounts(actor: AccountActor) {
  return actor.role === "admin";
}

export function canRetainOwnAdminAccess(input: {
  actorUserId: string;
  targetUserId: string;
  nextRole: UserRole;
  nextStatus: UserStatus;
}) {
  if (input.actorUserId.toLowerCase() !== input.targetUserId.toLowerCase()) {
    return true;
  }

  return input.nextRole === "admin" && input.nextStatus === "active";
}

export function canDeactivateAccount(input: { actorUserId: string; targetUserId: string }) {
  return input.actorUserId.toLowerCase() !== input.targetUserId.toLowerCase();
}
