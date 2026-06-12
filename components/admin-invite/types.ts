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

/**
 * Email delivery state of an invite: "queued" until the worker delivers
 * ("sent") or the job permanently fails ("failed"); "not_requested" when the
 * invite URL is shared manually instead.
 */
export type InviteEmailStatus = "not_requested" | "queued" | "failed" | "sent";

export const inviteStatusLabels: Record<InviteEmailStatus, string> = {
  not_requested: verbiage.adminInvite.status.notRequested,
  queued: verbiage.adminInvite.status.queued,
  failed: verbiage.adminInvite.status.failed,
  sent: verbiage.adminInvite.status.sent,
};

export type InviteStatus = InviteEmailStatus | "error";

export type InviteRecord = {
  id: string;
  email: string;
  role: InviteRole;
  invitedAt: string;
  status: InviteEmailStatus;
};

export type InviteActionResult = {
  status: InviteStatus;
  message: string;
  invite?: InviteRecord;
};
