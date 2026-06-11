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

export type InviteStatus = "sent" | "queued" | "error";

/**
 * Named emailDelivery (not status) because the admin users page already uses
 * "Pending" as the acceptance status of an invite.
 */
export type InviteEmailDelivery = "sent" | "queued" | "failed";

export type InviteRecord = {
  id: string;
  email: string;
  role: InviteRole;
  invitedAt: string;
  emailDelivery: InviteEmailDelivery;
};

export type InviteActionResult = {
  status: InviteStatus;
  message: string;
  invite?: InviteRecord;
  /** Set when the message asks the admin to share the invite link manually. */
  inviteUrl?: string;
};
