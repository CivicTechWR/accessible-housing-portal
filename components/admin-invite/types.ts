import verbiage from "@/content/verbiage.json";

export type InviteRole = "admin" | "partner" | "user";

export const inviteRoleLabels: Record<InviteRole, string> = {
  admin: verbiage.adminInvite.roles.admin,
  partner: verbiage.adminInvite.roles.partner,
  user: verbiage.adminInvite.roles.user,
};

export const inviteRoleOptions = [
  { value: "user", label: inviteRoleLabels.user },
  { value: "partner", label: inviteRoleLabels.partner },
] as const;

export const defaultInviteRole = inviteRoleOptions[0].value;

export type InviteFormValues = {
  name: string;
  email: string;
  role: InviteRole;
  organization: string;
};

export type InviteStatus = "sent" | "error";

export type InviteRecord = {
  id: string;
  email: string;
  role: InviteRole;
  invitedAt: string;
  status: InviteStatus;
};

export type InviteActionResult = {
  status: InviteStatus;
  message: string;
  invite?: InviteRecord;
};
