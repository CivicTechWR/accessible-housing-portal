import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { lower, userInvites, users, type UserRole } from "@/db/schema";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/auth/token";
import { buildAccountInviteEmailJob } from "@/lib/email-queue/email-job";
import { enqueueEmail } from "@/lib/email-queue/queue";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export async function createInvite(params: {
  email: string;
  fullName: string;
  role: UserRole;
  organization?: string | null;
  invitedByUserId: string;
  sendInviteEmail?: boolean;
}) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const now = new Date();
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const inviteUrl = new URL(`/invite?token=${token}`, baseUrl).toString();

  const result = await db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(lower(users.email), normalizedEmail))
      .limit(1);

    const organization =
      params.organization === undefined
        ? (existingUser?.organization ?? null)
        : params.organization;

    const userId = existingUser?.id ?? randomUUID();

    if (existingUser) {
      await tx
        .update(users)
        .set({
          fullName: params.fullName,
          organization,
          role: params.role,
          status: existingUser.passwordHash ? existingUser.status : "invited",
        })
        .where(eq(users.id, existingUser.id));
    } else {
      await tx.insert(users).values({
        id: userId,
        email: normalizedEmail,
        fullName: params.fullName,
        organization,
        role: params.role,
        status: "invited",
      });
    }

    await tx
      .update(userInvites)
      .set({
        expiresAt: now,
      })
      .where(
        and(
          eq(userInvites.userId, userId),
          isNull(userInvites.acceptedAt),
          gt(userInvites.expiresAt, now),
        ),
      );

    const [invite] = await tx
      .insert(userInvites)
      .values({
        userId,
        email: normalizedEmail,
        tokenHash,
        expiresAt,
        sentAt: null,
        createdByUserId: params.invitedByUserId,
      })
      .returning();

    if (!invite) {
      throw new Error("Failed to create invite.");
    }

    // Enqueue in the same transaction as the invite so a committed invite can
    // never lose its email job. The email is queued, not sent: the worker
    // delivers it and sets sentAt afterwards.
    if (params.sendInviteEmail) {
      await enqueueEmail(tx, buildAccountInviteEmailJob({ inviteId: invite.id, inviteUrl }));
    }

    return {
      invite,
      userId,
      email: normalizedEmail,
      organization,
    };
  });

  return {
    ...result,
    inviteUrl,
  };
}
