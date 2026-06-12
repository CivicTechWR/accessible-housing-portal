import "server-only";

import { and, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import { userInvites, users, type UserRole } from "@/db/schema";
import { hashOpaqueToken } from "@/lib/auth/token";

export type RecentAccountInviteRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string | null;
  invitedAt: Date;
};

export type PendingAccountInviteRow = RecentAccountInviteRow & {
  expiresAt: Date;
};

export class InviteUnavailableError extends Error {
  constructor() {
    super("Invite is no longer valid.");
    this.name = "InviteUnavailableError";
  }
}

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
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .where(
      and(
        isNull(userInvites.acceptedAt),
        isNotNull(userInvites.sentAt),
        gt(userInvites.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(userInvites.sentAt), desc(userInvites.createdAt))
    .limit(limit);

  return rows.flatMap((row) => {
    if (!row.sentAt) {
      return [];
    }

    return [
      {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        organization: row.organization,
        invitedAt: row.sentAt,
      },
    ];
  });
}

export async function findPendingAccountInvites(): Promise<PendingAccountInviteRow[]> {
  const rows = await db
    .select({
      id: userInvites.id,
      email: userInvites.email,
      name: users.fullName,
      role: users.role,
      organization: users.organization,
      sentAt: userInvites.sentAt,
      expiresAt: userInvites.expiresAt,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .where(
      and(
        isNull(userInvites.acceptedAt),
        isNotNull(userInvites.sentAt),
        gt(userInvites.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(userInvites.sentAt), desc(userInvites.createdAt));

  return rows.flatMap((row) => {
    if (!row.sentAt) {
      return [];
    }

    return [
      {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        organization: row.organization,
        invitedAt: row.sentAt,
        expiresAt: row.expiresAt,
      },
    ];
  });
}

/**
 * Resolve the recipient details for a queued invite email at send time. The
 * job payload only stores the invite id, so the email and name stay out of
 * the job table and reflect the current database state.
 */
export async function findInviteEmailJobTarget(inviteId: string) {
  const [row] = await db
    .select({
      email: userInvites.email,
      fullName: users.fullName,
      expiresAt: userInvites.expiresAt,
      acceptedAt: userInvites.acceptedAt,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .where(eq(userInvites.id, inviteId))
    .limit(1);

  return row ?? null;
}

export async function markInviteEmailSent(inviteId: string) {
  await db.update(userInvites).set({ sentAt: new Date() }).where(eq(userInvites.id, inviteId));
}

export async function acceptInvite(params: {
  inviteId: string;
  userId: string;
  passwordHash: string;
}) {
  const now = new Date();

  await db.transaction(async (tx) => {
    const acceptedInvites = await tx
      .update(userInvites)
      .set({
        acceptedAt: now,
      })
      .where(
        and(
          eq(userInvites.id, params.inviteId),
          eq(userInvites.userId, params.userId),
          isNull(userInvites.acceptedAt),
          gt(userInvites.expiresAt, now),
        ),
      )
      .returning({ id: userInvites.id });

    if (acceptedInvites.length === 0) {
      throw new InviteUnavailableError();
    }

    await tx
      .update(users)
      .set({
        passwordHash: params.passwordHash,
        status: "active",
        inviteAcceptedAt: now,
      })
      .where(eq(users.id, params.userId));
  });
}
