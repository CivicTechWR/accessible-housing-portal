import "server-only";

import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { userInvites, users, type UserRole } from "@/db/schema";
import { hashOpaqueToken } from "@/lib/auth/token";

/**
 * Email delivery state of an invite, derived from persisted columns:
 * "sent" (worker delivered, sentAt set), "failed" (job dead-lettered,
 * emailFailedAt set), "queued" (job enqueued, emailQueuedAt set), or
 * "not_requested" (no email; the invite URL is shared manually).
 */
export type AccountInviteEmailStatus = "not_requested" | "queued" | "failed" | "sent";

export type RecentAccountInviteRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string | null;
  invitedAt: Date;
  status: AccountInviteEmailStatus;
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

/**
 * Invites whose email has not been delivered yet are included too, so an
 * invite stays visible between enqueue and delivery ("queued"), after its
 * email job permanently failed ("failed"), and when no invite email was
 * requested and the URL is shared manually ("not_requested").
 */
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

export async function findPendingAccountInvites(): Promise<PendingAccountInviteRow[]> {
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
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .where(and(isNull(userInvites.acceptedAt), gt(userInvites.expiresAt, new Date())))
    .orderBy(desc(sql`coalesce(${userInvites.sentAt}, ${userInvites.createdAt})`));

  return rows.map((row) => ({ ...toAccountInviteRow(row), expiresAt: row.expiresAt }));
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
    return "sent";
  }

  if (row.emailFailedAt) {
    return "failed";
  }

  return row.emailQueuedAt ? "queued" : "not_requested";
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

/**
 * Record that the invite's email job permanently failed (dead-lettered), so
 * admin lists can show "failed" instead of an eternal "queued". The sentAt
 * guard keeps a stray late failure from masking a provider-accepted email.
 */
export async function markInviteEmailFailed(inviteId: string) {
  await db
    .update(userInvites)
    .set({ emailFailedAt: new Date() })
    .where(and(eq(userInvites.id, inviteId), isNull(userInvites.sentAt)));
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
