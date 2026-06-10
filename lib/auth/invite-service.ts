import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { lower, userInvites, users, type UserRole } from "@/db/schema";
import { getAccountInviteEmailIdempotencyKey } from "@/lib/auth/invite-email";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/auth/token";
import { enqueueEmailJob, tryProcessEmailJobNow } from "@/lib/email-jobs/email-job-service";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Truthful delivery status for the invite email: "sent" only when the
 * provider accepted it during the request, "queued" while the durable job
 * still owns delivery, "failed" when the job already dead-lettered, and null
 * when no email was requested.
 */
export type InviteEmailDelivery = "sent" | "queued" | "failed" | null;

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

    // Outbox: the email job commits atomically with the invite, so a created
    // invite can never lose its email to a provider outage. The raw token only
    // travels inside the encrypted secret context, never as plaintext payload.
    let emailJobId: string | null = null;

    if (params.sendInviteEmail) {
      const { job } = await enqueueEmailJob(
        {
          type: "account_invite",
          payload: { inviteId: invite.id },
          secretContext: { inviteUrl },
          idempotencyKey: getAccountInviteEmailIdempotencyKey(invite.id),
          recipientEmail: normalizedEmail,
        },
        { executor: tx },
      );

      emailJobId = job.id;
    }

    return {
      invite,
      userId,
      email: normalizedEmail,
      organization,
      emailJobId,
    };
  });

  let emailDelivery: InviteEmailDelivery = null;

  if (result.emailJobId) {
    // Best effort so admins usually see the invite go out immediately; on
    // failure the job stays queued and the worker retries with backoff.
    const outcome = await tryProcessEmailJobNow(result.emailJobId);

    emailDelivery =
      outcome === "sent"
        ? "sent"
        : outcome === "failed" || outcome === "canceled"
          ? "failed"
          : "queued";

    const [invite] = await db
      .select()
      .from(userInvites)
      .where(eq(userInvites.id, result.invite.id))
      .limit(1);

    result.invite = invite ?? result.invite;
  }

  return {
    ...result,
    inviteUrl,
    emailDelivery,
  };
}
