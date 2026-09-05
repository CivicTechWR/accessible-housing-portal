import "server-only";

import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { userInvites, users, type UserRole } from "@/db/schema";
import { hashOpaqueToken } from "@/lib/auth/token";

export type AccountInviteEmailStatus = "not_requested" | "queued" | "failed" | "submitted";

export type RecentAccountInviteRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string | null;
  invitedAt: Date;
  status: AccountInviteEmailStatus;
};

export type AccountInviteRow = RecentAccountInviteRow & {
  expiresAt: Date;
  lifecycle: "pending" | "accepted" | "expired" | "revoked";
  canResend: boolean;
};

export async function getPendingInviteByToken(token: string) {
  const tokenHash = hashOpaqueToken(token);
  const [invite] = await db
    .select({
      invite: userInvites,
      user: {
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        status: users.status,
      },
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .where(
      and(
        eq(userInvites.tokenHash, tokenHash),
        isNull(userInvites.acceptedAt),
        gt(userInvites.expiresAt, new Date()),
        eq(users.status, "invited"),
      ),
    )
    .limit(1);

  return invite ?? null;
}

export async function findRecentAccountInvites(limit: number): Promise<RecentAccountInviteRow[]> {
  const rows = await db
    .select({
      id: userInvites.id,
      email: userInvites.email,
      name: users.fullName,
      role: users.role,
      organization: users.organization,
      sentAt: userInvites.sentAt,
      emailQueuedAt: userInvites.emailQueuedAt,
      emailFailedAt: userInvites.emailFailedAt,
      createdAt: userInvites.createdAt,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .where(and(isNull(userInvites.acceptedAt), gt(userInvites.expiresAt, new Date())))
    .orderBy(desc(sql`coalesce(${userInvites.sentAt}, ${userInvites.createdAt})`))
    .limit(limit);

  return rows.map(toAccountInviteRow);
}

export async function findAccountInvites(): Promise<AccountInviteRow[]> {
  const rows = await db
    .select({
      id: userInvites.id,
      email: userInvites.email,
      name: users.fullName,
      role: users.role,
      organization: users.organization,
      sentAt: userInvites.sentAt,
      emailQueuedAt: userInvites.emailQueuedAt,
      emailFailedAt: userInvites.emailFailedAt,
      createdAt: userInvites.createdAt,
      expiresAt: userInvites.expiresAt,
      acceptedAt: userInvites.acceptedAt,
      revokedAt: userInvites.revokedAt,
      userStatus: users.status,
      inviteAcceptedAt: users.inviteAcceptedAt,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .orderBy(desc(userInvites.createdAt))
    .limit(100);

  return rows.map((row) => ({
    ...toAccountInviteRow(row),
    expiresAt: row.expiresAt,
    lifecycle: row.acceptedAt
      ? "accepted"
      : row.revokedAt
        ? "revoked"
        : row.expiresAt <= new Date()
          ? "expired"
          : "pending",
    canResend: row.userStatus === "invited" && !row.inviteAcceptedAt,
  }));
}

function toAccountInviteRow(row: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string | null;
  sentAt: Date | null;
  emailQueuedAt: Date | null;
  emailFailedAt: Date | null;
  createdAt: Date;
}): RecentAccountInviteRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    organization: row.organization,
    invitedAt: row.sentAt ?? row.createdAt,
    status: toEmailStatus(row),
  };
}

function toEmailStatus(row: {
  sentAt: Date | null;
  emailQueuedAt: Date | null;
  emailFailedAt: Date | null;
}): AccountInviteEmailStatus {
  if (row.sentAt) {
    return "submitted";
  }

  if (row.emailFailedAt) {
    return "failed";
  }

  return row.emailQueuedAt ? "queued" : "not_requested";
}

export async function findInviteEmailJobTarget(inviteId: string) {
  const [row] = await db
    .select({
      email: userInvites.email,
      fullName: users.fullName,
      userStatus: users.status,
      expiresAt: userInvites.expiresAt,
      acceptedAt: userInvites.acceptedAt,
      sentAt: userInvites.sentAt,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .where(eq(userInvites.id, inviteId))
    .limit(1);

  return row ?? null;
}

export async function markInviteEmailSubmitted(inviteId: string) {
  await db.update(userInvites).set({ sentAt: new Date() }).where(eq(userInvites.id, inviteId));
}

export async function markInviteEmailFailed(inviteId: string) {
  await db
    .update(userInvites)
    .set({ emailFailedAt: new Date() })
    .where(and(eq(userInvites.id, inviteId), isNull(userInvites.sentAt)));
}
