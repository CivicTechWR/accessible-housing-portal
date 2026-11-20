import verbiage from "@/content/verbiage.json";
import type { InviteEmailStatus } from "@/shared/schemas/account-management";

export type InviteRole = "admin" | "partner" | "user";

export const inviteRoleLabels: Record<InviteRole, string> = {
  admin: verbiage.adminInvite.roles.admin,
  partner: verbiage.adminInvite.roles.partner,
  user: verbiage.adminInvite.roles.user,
};

export const inviteRoleOptions = [
  { value: "user", label: inviteRoleLabels.user },
  { value: "partner", label: inviteRoleLabels.partner },
  { value: "admin", label: inviteRoleLabels.admin },
] as const;

export const defaultInviteRole = inviteRoleOptions[0].value;

export type InviteFormValues = {
  name: string;
  email: string;
  role: InviteRole;
  organization: string;
};

export type InviteRecord = {
  id: string;
  email: string;
  role: InviteRole;
  invitedAt: string;
  emailStatus: InviteEmailStatus | null;
};

export type InviteActionResult = {
  status: "not_requested" | "queued" | "error";
  message: string;
  invite?: InviteRecord;
  inviteUrl?: string;
};
