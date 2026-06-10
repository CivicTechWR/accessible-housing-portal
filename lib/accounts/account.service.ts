import "server-only";

import { createInvite } from "@/lib/auth/invite-service";
import { findRecentAccountInvites } from "@/lib/auth/invite-store";
import { getOptionalSession } from "@/lib/auth/session";
import { fail, succeed, type DomainResult } from "@/lib/http/domain-result";
import {
  findAccountById,
  findAccounts,
  findAccountUpdateTarget,
  updateAccountById,
  deactivateAccountById,
} from "@/lib/accounts/account.repository";
import {
  accountRoleSpecification,
  accountSearchSpecification,
  accountStatusSpecification,
  andAccountSpecifications,
} from "@/lib/accounts/account.specifications";
import {
  canDeactivateAccount,
  canManageAccounts,
  canRetainOwnAdminAccess,
  type AccountActor,
} from "@/lib/policies/account-policy";
import type {
  AccountByIdResponse,
  AccountInviteListResponse,
  AccountListResponse,
  AccountQuery,
  CreateAccountInviteInput,
  CreateAccountResponse,
  DeactivateAccountResponse,
  UpdateAccountInput,
  UpdateAccountResponse,
} from "@/shared/schemas/account-management";

export async function getAccountsService(
  query: AccountQuery,
): Promise<DomainResult<AccountListResponse>> {
  const actorResult = await requireAccountsActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 20;

  const where = andAccountSpecifications(
    accountRoleSpecification(query.role),
    accountStatusSpecification(query.status),
    accountSearchSpecification(query.search),
  );

  const { total, rows } = await findAccounts({
    where,
    page,
    limit,
  });

  return succeed({
    data: rows.map((row) => ({
      ...row,
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  });
}

export async function getRecentAccountInvitesService(
  limit: number,
): Promise<DomainResult<AccountInviteListResponse>> {
  const actorResult = await requireAccountsActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const invites = await findRecentAccountInvites(limit);

  return succeed({
    data: invites.map((invite) => ({
      ...invite,
      invitedAt: invite.invitedAt.toISOString(),
    })),
  });
}

export async function createAccountService(
  input: CreateAccountInviteInput,
): Promise<DomainResult<CreateAccountResponse>> {
  const actorResult = await requireAccountsActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const invite = await createInvite({
    email: input.email,
    fullName: input.name,
    role: input.role,
    organization: input.organization,
    invitedByUserId: actorResult.value.actor.userId,
    sendInviteEmail: input.sendInviteEmail === true,
  });

  const messageByEmailDelivery = {
    sent: "Account invited",
    queued:
      "Account invited. The invite email is queued and will be delivered automatically once the email provider is reachable.",
    failed:
      "Account invited, but the invite email could not be delivered. Share the invite link manually or send a new invite.",
  } as const;

  return succeed({
    message: invite.emailDelivery
      ? messageByEmailDelivery[invite.emailDelivery]
      : "Account invited",
    data: {
      id: invite.userId,
      email: invite.email,
      name: input.name,
      role: input.role,
      organization: invite.organization,
      inviteUrl: invite.inviteUrl,
      emailDelivery: invite.emailDelivery,
    },
  });
}

export async function getAccountByIdService(
  accountId: string,
): Promise<DomainResult<AccountByIdResponse>> {
  const actorResult = await requireAccountsActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const account = await findAccountById(accountId);

  if (!account) {
    return fail("not_found", "Account not found");
  }

  return succeed({
    data: {
      ...account,
      lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    },
  });
}

export async function updateAccountByIdService(input: {
  accountId: string;
  payload: UpdateAccountInput;
}): Promise<DomainResult<UpdateAccountResponse>> {
  const actorResult = await requireAccountsActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const targetUser = await findAccountUpdateTarget(input.accountId);

  if (!targetUser) {
    return fail("not_found", "Account not found");
  }

  const nextRole = input.payload.role ?? targetUser.role;
  const nextStatus = input.payload.status ?? targetUser.status;

  if (
    !canRetainOwnAdminAccess({
      actorUserId: actorResult.value.actor.userId,
      targetUserId: input.accountId,
      nextRole,
      nextStatus,
    })
  ) {
    return fail("conflict", "You cannot remove your own admin access.");
  }

  const updated = await updateAccountById({
    accountId: input.accountId,
    name: input.payload.name,
    role: input.payload.role,
    status: input.payload.status,
    organization: input.payload.organization,
  });

  if (!updated) {
    return fail("not_found", "Account not found");
  }

  return succeed({
    message: "Account updated",
    data: {
      id: input.accountId,
      ...input.payload,
    },
  });
}

export async function deactivateAccountByIdService(
  accountId: string,
): Promise<DomainResult<DeactivateAccountResponse>> {
  const actorResult = await requireAccountsActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  if (
    !canDeactivateAccount({
      actorUserId: actorResult.value.actor.userId,
      targetUserId: accountId,
    })
  ) {
    return fail("conflict", "You cannot deactivate your own admin account.");
  }

  const updated = await deactivateAccountById(accountId);

  if (!updated) {
    return fail("not_found", "Account not found");
  }

  return succeed({
    message: "Account deactivated",
    data: {
      id: accountId,
    },
  });
}

async function requireAccountsActor(): Promise<
  DomainResult<{
    actor: AccountActor;
  }>
> {
  const optionalSession = await getOptionalSession();

  if (!optionalSession.session || !optionalSession.authzUser) {
    return fail("unauthorized", "Unauthorized");
  }

  const actor: AccountActor = {
    userId: optionalSession.session.user.id,
    role: optionalSession.authzUser.role,
  };

  if (!canManageAccounts(actor)) {
    return fail("forbidden", "Forbidden");
  }

  return succeed({
    actor,
  });
}
