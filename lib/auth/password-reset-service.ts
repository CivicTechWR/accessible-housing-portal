import "server-only";

import { and, count, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/auth/token";
import { buildPasswordResetEmailJob } from "@/lib/email-queue/email-job";
import { enqueueEmail } from "@/lib/email-queue/queue";

export const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;
const PASSWORD_RESET_HOUR_MS = 1000 * 60 * 60;

/**
 * Per-user throttle: at most this many reset requests per hour, regardless of
 * outcome. Callers must return the same neutral response whether or not the
 * request was created, so this never leaks account existence.
 */
export const PASSWORD_RESET_MAX_PER_HOUR = 3;

export class PasswordResetUnavailableError extends Error {
  constructor() {
    super("Password reset link is invalid or has expired.");
    this.name = "PasswordResetUnavailableError";
  }
}

/**
 * Cheap validity check (no expensive hashing on the caller's side beyond one
 * sha256) so request handlers can reject unknown/used/expired tokens before
 * doing expensive work like scrypt password hashing. The conditional UPDATE
 * in consumePasswordResetToken remains the final race check.
 */
export async function findUnconsumedPasswordResetToken(token: string) {
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();

  const [row] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Create a password reset request for a user. Everything happens inside one
 * transaction serialized on the user row (SELECT … FOR UPDATE), so concurrent
 * requests cannot both keep an old token alive while inserting a new one:
 * the throttle check, expiry of outstanding tokens, insert, and email enqueue
 * are all evaluated under the lock. Only the token hash is stored.
 */
export async function createPasswordReset(params: { userId: string }): Promise<{
  created: boolean;
}> {
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = new URL(`/reset-password?token=${token}`, baseUrl).toString();

  const created = await db.transaction(async (tx) => {
    // Lock the user row so concurrent requests for the same user serialize
    // here instead of racing between expiry and insert.
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1)
      .for("update");

    if (!user) {
      return false;
    }

    const now = new Date();
    const hourAgo = new Date(now.getTime() - PASSWORD_RESET_HOUR_MS);
    const [recent] = await tx
      .select({ value: count() })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, params.userId),
          gt(passwordResetTokens.createdAt, hourAgo),
        ),
      );

    if (Number(recent?.value ?? 0) >= PASSWORD_RESET_MAX_PER_HOUR) {
      return false;
    }

    await tx
      .update(passwordResetTokens)
      .set({ expiresAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, params.userId),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      );

    const [resetToken] = await tx
      .insert(passwordResetTokens)
      .values({
        userId: params.userId,
        tokenHash,
        expiresAt,
        emailQueuedAt: now,
      })
      .returning();

    if (!resetToken) {
      throw new Error("Failed to create password reset request.");
    }

    await enqueueEmail(tx, buildPasswordResetEmailJob({ tokenId: resetToken.id, resetUrl }));

    return true;
  });

  return { created };
}

/**
 * Resolve the recipient details and validity state for a queued reset email
 * at send time. The job payload only stores the token row id, so the email
 * and name stay out of the job table and reflect the current database state.
 */
export async function findPasswordResetEmailJobTarget(tokenId: string) {
  const [row] = await db
    .select({
      email: users.email,
      fullName: users.fullName,
      usedAt: passwordResetTokens.usedAt,
      expiresAt: passwordResetTokens.expiresAt,
      sentAt: passwordResetTokens.sentAt,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.userId, users.id))
    .where(eq(passwordResetTokens.id, tokenId))
    .limit(1);

  return row ?? null;
}

export async function markPasswordResetEmailSubmitted(tokenId: string) {
  await db
    .update(passwordResetTokens)
    .set({ sentAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

/**
 * Record that the reset email job permanently failed (dead-lettered). The
 * sentAt guard keeps a stray late failure from masking a provider-accepted
 * email.
 */
export async function markPasswordResetEmailFailed(tokenId: string) {
  await db
    .update(passwordResetTokens)
    .set({ emailFailedAt: new Date() })
    .where(and(eq(passwordResetTokens.id, tokenId), isNull(passwordResetTokens.sentAt)));
}

/**
 * Consume a password reset token atomically and update the user's password.
 * The conditional UPDATE makes consumption single-use: only an unused,
 * unexpired token row can be claimed, and a repeat call (or a racing one)
 * finds no row and fails. Any sibling unused tokens are expired in the same
 * transaction, so a password can only ever be changed by the newest link.
 * User status is deliberately untouched — a suspended or deactivated account
 * must not be reactivated by a reset.
 */
export async function consumePasswordResetToken(params: { token: string; passwordHash: string }) {
  const now = new Date();
  const tokenHash = hashOpaqueToken(params.token);

  await db.transaction(async (tx) => {
    const consumed = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ id: passwordResetTokens.id, userId: passwordResetTokens.userId });

    const claimed = consumed[0];

    if (!claimed) {
      throw new PasswordResetUnavailableError();
    }

    await tx
      .update(passwordResetTokens)
      .set({ expiresAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, claimed.userId),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      );

    await tx
      .update(users)
      .set({ passwordHash: params.passwordHash })
      .where(eq(users.id, claimed.userId));
  });
}

/**
 * Update a signed-in user's password and expire every unused, unexpired reset
 * token in one transaction, so a link issued before the change cannot
 * overwrite the new password afterwards.
 */
export async function updateUserPasswordExpiringResets(params: {
  userId: string;
  passwordHash: string;
}) {
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: params.passwordHash })
      .where(eq(users.id, params.userId));

    await tx
      .update(passwordResetTokens)
      .set({ expiresAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, params.userId),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      );
  });
}
