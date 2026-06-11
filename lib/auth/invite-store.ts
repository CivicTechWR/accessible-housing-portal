import "server-only";

import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailJobs, userInvites, users, type UserRole } from "@/db/schema";
import { hashOpaqueToken } from "@/lib/auth/token";

export type InviteEmailDeliveryStatus = "sent" | "queued" | "failed";

export type RecentAccountInviteRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string | null;
  invitedAt: Date;
  emailDelivery: InviteEmailDeliveryStatus;
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
 * Joins an invite to its email job through the deterministic idempotency key
 * (account_invite/<inviteId>), which is unique-indexed on email_jobs.
 */
const inviteEmailJobJoin = eq(
  emailJobs.idempotencyKey,
  sql`'account_invite/' || ${userInvites.id}::text`,
);

/**
 * Truthful delivery state derived from the email job, not from sent_at alone:
 * a failed or canceled job also has sent_at = null and must not read as
 * queued. Invites with neither a job nor sent_at (manual link sharing) yield
 * null and are excluded from email-centric lists.
 */
const inviteEmailDelivery = sql<InviteEmailDeliveryStatus | null>`
  case
    when ${emailJobs.status} in ('pending', 'processing') then 'queued'
    when ${emailJobs.status} in ('failed', 'canceled') then 'failed'
    when ${emailJobs.status} = 'sent' or ${userInvites.sentAt} is not null then 'sent'
  end
`;

const inviteInvitedAtOrder = sql`coalesce(${userInvites.sentAt}, ${userInvites.createdAt})`;

export async function findRecentAccountInvites(limit: number): Promise<RecentAccountInviteRow[]> {
  const rows = await db
    .select({
      id: userInvites.id,
      email: userInvites.email,
      name: users.fullName,
      role: users.role,
      organization: users.organization,
      sentAt: userInvites.sentAt,
      createdAt: userInvites.createdAt,
      emailDelivery: inviteEmailDelivery,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .leftJoin(emailJobs, inviteEmailJobJoin)
    .where(
      and(
        isNull(userInvites.acceptedAt),
        gt(userInvites.expiresAt, new Date()),
        isNotNull(inviteEmailDelivery),
      ),
    )
    .orderBy(desc(inviteInvitedAtOrder), desc(userInvites.createdAt))
    .limit(limit);

  return rows.flatMap((row) => {
    if (!row.emailDelivery) {
      return [];
    }

    return [
      {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        organization: row.organization,
        invitedAt: row.sentAt ?? row.createdAt,
        emailDelivery: row.emailDelivery,
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
      createdAt: userInvites.createdAt,
      expiresAt: userInvites.expiresAt,
      emailDelivery: inviteEmailDelivery,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .leftJoin(emailJobs, inviteEmailJobJoin)
    .where(
      and(
        isNull(userInvites.acceptedAt),
        gt(userInvites.expiresAt, new Date()),
        isNotNull(inviteEmailDelivery),
      ),
    )
    .orderBy(desc(inviteInvitedAtOrder), desc(userInvites.createdAt));

  return rows.flatMap((row) => {
    if (!row.emailDelivery) {
      return [];
    }

    return [
      {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        organization: row.organization,
        invitedAt: row.sentAt ?? row.createdAt,
        expiresAt: row.expiresAt,
        emailDelivery: row.emailDelivery,
      },
    ];
  });
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
