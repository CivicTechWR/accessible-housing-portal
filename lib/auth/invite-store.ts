import "server-only";

import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  emailDeliveries,
  emailDeliveryAttempts,
  resendWebhookEvents,
  userInvites,
  users,
  type UserRole,
} from "@/db/schema";
import { hashOpaqueToken } from "@/lib/auth/token";
import {
  getInviteEmailStatus,
  type InviteEmailHistory,
} from "@/lib/email-delivery/invite-email-status";
import type { InviteEmailStatus } from "@/shared/schemas/account-management";

export type AccountInviteRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string | null;
  invitedAt: Date;
  expiresAt: Date;
  lifecycle: "pending" | "accepted" | "expired" | "revoked";
  canResend: boolean;
  /** Null unless the invitation can still be used. */
  emailStatus: InviteEmailStatus | null;
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

function selectInvites() {
  return db
    .select({
      id: userInvites.id,
      email: userInvites.email,
      name: users.fullName,
      role: users.role,
      organization: users.organization,
      sentAt: userInvites.sentAt,
      createdAt: userInvites.createdAt,
      expiresAt: userInvites.expiresAt,
      acceptedAt: userInvites.acceptedAt,
      revokedAt: userInvites.revokedAt,
      sealedUrl: userInvites.sealedUrl,
      userStatus: users.status,
      inviteAcceptedAt: users.inviteAcceptedAt,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id));
}

/** Unaccepted, unexpired invitations, most recently sent first. */
export async function findRecentAccountInvites(limit: number): Promise<AccountInviteRow[]> {
  return toAccountInviteRows(
    await selectInvites()
      .where(and(isNull(userInvites.acceptedAt), gt(userInvites.expiresAt, new Date())))
      .orderBy(desc(sql`coalesce(${userInvites.sentAt}, ${userInvites.createdAt})`))
      .limit(limit),
  );
}

export async function findAccountInvites(): Promise<AccountInviteRow[]> {
  return toAccountInviteRows(await selectInvites().orderBy(desc(userInvites.createdAt)).limit(100));
}

async function toAccountInviteRows(
  rows: Awaited<ReturnType<typeof selectInvites>>,
): Promise<AccountInviteRow[]> {
  const now = new Date();
  const emailHistories = await findInviteEmailHistories(rows.map((row) => row.id));

  return rows.map((row) => {
    const history = emailHistories.get(row.id);

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      organization: row.organization,
      invitedAt: row.sentAt ?? row.createdAt,
      expiresAt: row.expiresAt,
      lifecycle: row.acceptedAt
        ? "accepted"
        : row.revokedAt
          ? "revoked"
          : row.expiresAt <= now
            ? "expired"
            : "pending",
      canResend: row.userStatus === "invited" && !row.inviteAcceptedAt,
      emailStatus: getInviteEmailStatus(
        {
          invite: row,
          userStatus: row.userStatus,
          attempts: [...(history?.attempts.values() ?? [])],
          events: history?.events ?? [],
        },
        now,
      ),
    };
  });
}

type InviteEmailRecords = {
  // Keyed by attempt id: the join repeats an attempt once per event.
  attempts: Map<string, InviteEmailHistory["attempts"][number]>;
  events: InviteEmailHistory["events"][number][];
};

/**
 * The delivery attempts of each invitation's email and the provider events reconciled to
 * them, in one query for all `inviteIds`. An event that reconciliation has not linked to
 * its attempt yet is left out. It has not changed the attempt either, and the worker links
 * it within five minutes.
 */
async function findInviteEmailHistories(
  inviteIds: string[],
): Promise<Map<string, InviteEmailRecords>> {
  if (inviteIds.length === 0) return new Map();

  const rows = await db
    .select({
      inviteId: emailDeliveries.sourceEntityId,
      attempt: {
        id: emailDeliveryAttempts.id,
        attemptNumber: emailDeliveryAttempts.attemptNumber,
        outcome: emailDeliveryAttempts.outcome,
        outcomeAt: emailDeliveryAttempts.outcomeAt,
        outcomeDetail: emailDeliveryAttempts.outcomeDetail,
      },
      event: {
        // Kept first: drizzle reads a left-joined object as null from its first column.
        eventType: resendWebhookEvents.eventType,
        bounceType: resendWebhookEvents.bounceType,
        bounceSubtype: resendWebhookEvents.bounceSubtype,
      },
    })
    .from(emailDeliveries)
    .innerJoin(emailDeliveryAttempts, eq(emailDeliveryAttempts.deliveryId, emailDeliveries.id))
    .leftJoin(
      resendWebhookEvents,
      eq(resendWebhookEvents.deliveryAttemptId, emailDeliveryAttempts.id),
    )
    .where(
      and(
        eq(emailDeliveries.emailType, "account_invite"),
        inArray(emailDeliveries.sourceEntityId, inviteIds),
      ),
    );

  const histories = new Map<string, InviteEmailRecords>();

  for (const { inviteId, attempt, event } of rows) {
    let history = histories.get(inviteId);
    if (!history) {
      history = { attempts: new Map(), events: [] };
      histories.set(inviteId, history);
    }
    history.attempts.set(attempt.id, attempt);
    if (event) history.events.push(event);
  }

  return histories;
}

export async function findInviteEmailJobTarget(inviteId: string, attemptId: string) {
  const [row] = await db
    .select({
      email: userInvites.email,
      fullName: users.fullName,
      role: users.role,
      userStatus: users.status,
      expiresAt: userInvites.expiresAt,
      acceptedAt: userInvites.acceptedAt,
      revokedAt: userInvites.revokedAt,
      // Of the job's own attempt. An invitation can have several attempts, so the
      // invite-wide `sentAt` can't say whether this one went out.
      attemptSubmittedAt: emailDeliveryAttempts.submittedAt,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .leftJoin(emailDeliveryAttempts, eq(emailDeliveryAttempts.id, attemptId))
    .where(eq(userInvites.id, inviteId))
    .limit(1);

  return row ?? null;
}

/** Keeps the first submission time when a later attempt of the same invitation is sent. */
export async function markInviteEmailSubmitted(inviteId: string) {
  await db
    .update(userInvites)
    .set({ sentAt: new Date() })
    .where(and(eq(userInvites.id, inviteId), isNull(userInvites.sentAt)));
}

export async function markInviteEmailFailed(inviteId: string) {
  await db
    .update(userInvites)
    .set({ emailFailedAt: new Date() })
    .where(and(eq(userInvites.id, inviteId), isNull(userInvites.sentAt)));
}
