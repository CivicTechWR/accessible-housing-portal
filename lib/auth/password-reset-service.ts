import "server-only";

import { and, count, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/auth/token";
import { startEmailDeliveryAttempt } from "@/lib/email-delivery/store";
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
 * Create a password reset request serialized on the user row (SELECT … FOR
 * UPDATE): without the lock, concurrent requests can each expire the previous
 * tokens before seeing each other's insert, leaving two live tokens.
 */
export async function createPasswordReset(params: { userId: string }): Promise<{
  created: boolean;
}> {
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = new URL(`/reset-password?token=${token}`, baseUrl).toString();

  const created = await db.transaction(async (tx) => {
    // Lock the user row so concurrent requests serialize here instead of
    // racing between expiry and insert.
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
        expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
        emailQueuedAt: now,
      })
      .returning();

    if (!resetToken) {
      throw new Error("Failed to create password reset request.");
    }

    const attempt = await startEmailDeliveryAttempt(tx, {
      emailType: "password_reset",
      sourceEntityId: resetToken.id,
    });
    await enqueueEmail(
      tx,
      buildPasswordResetEmailJob({ tokenId: resetToken.id, resetUrl, attempt }),
    );

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

export async function markPasswordResetEmailFailed(tokenId: string) {
  await db
    .update(passwordResetTokens)
    .set({ emailFailedAt: new Date() })
    .where(and(eq(passwordResetTokens.id, tokenId), isNull(passwordResetTokens.sentAt)));
}

/**
 * Sibling unused tokens are expired with the claim so a password can only
 * ever be changed by the newest link. User status is deliberately untouched:
 * a suspended or deactivated account must not be reactivated by a reset.
 */
export async function consumePasswordResetToken(params: { token: string; passwordHash: string }) {
  const tokenHash = hashOpaqueToken(params.token);

  await db.transaction(async (tx) => {
    const [token] = await tx
      .select({ userId: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!token) {
      throw new PasswordResetUnavailableError();
    }

    // Match creation and account password changes: lock the user before any
    // token rows. Check expiry after the wait so a revoked link stays invalid.
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, token.userId))
      .limit(1)
      .for("update");

    if (!user) {
      throw new PasswordResetUnavailableError();
    }

    const now = new Date();
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

export async function updateUserPasswordExpiringResets(params: {
  userId: string;
  passwordHash: string;
}) {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: params.passwordHash })
      .where(eq(users.id, params.userId));

    const now = new Date();
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
