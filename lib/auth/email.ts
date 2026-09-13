import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, userInvites } from "@/db/schema";
import { invitationEmailContext } from "@/lib/auth/invite-context";
import { hashOpaqueToken } from "@/lib/auth/token";
import { startEmailDeliveryAttempt } from "@/lib/email-delivery/store";
import { buildAccountInviteEmailJob, sealEmailJobSecret } from "@/lib/email-queue/email-job";
import { enqueueEmail } from "@/lib/email-queue/queue";

export async function queueAuthEmail({ user, token }: { user: { id: string }; token: string }) {
  const context = invitationEmailContext.getStore();
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const expiresAt = new Date(Date.now() + (context ? 7 * 24 : 1) * 60 * 60 * 1000);
  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, user.id)).for("update");
    if (!target) return;
    if (context?.userId === user.id && target.status === "invited") {
      await tx
        .update(userInvites)
        .set({ expiresAt: new Date(), sealedUrl: null })
        .where(and(eq(userInvites.userId, user.id), isNull(userInvites.acceptedAt)));
      const inviteUrl = new URL(`/invite?token=${encodeURIComponent(token)}`, baseURL).toString();
      const [invite] = await tx
        .insert(userInvites)
        .values({
          userId: user.id,
          email: target.email,
          tokenHash: hashOpaqueToken(token),
          sealedUrl: sealEmailJobSecret(inviteUrl),
          expiresAt,
          createdByUserId: context.invitedByUserId,
          emailQueuedAt: context.sendEmail ? new Date() : null,
        })
        .returning();
      if (!invite) throw new Error("Unable to create invitation.");
      if (context.sendEmail) {
        const attempt = await startEmailDeliveryAttempt(tx, {
          emailType: "account_invite",
          sourceEntityId: invite.id,
        });
        await enqueueEmail(
          tx,
          buildAccountInviteEmailJob({ inviteId: invite.id, inviteUrl, attempt }),
        );
      }
      context.inviteUrl = inviteUrl;
      context.inviteId = invite.id;
    } else if (!context && target.status === "active") {
      const resetId = randomUUID();
      const attempt = await startEmailDeliveryAttempt(tx, {
        emailType: "password_reset",
        sourceEntityId: resetId,
      });
      await enqueueEmail(tx, {
        type: "password_reset",
        resetId,
        userId: user.id,
        expiresAt: expiresAt.toISOString(),
        attempt,
        secret: sealEmailJobSecret(
          new URL(`/reset-password?token=${encodeURIComponent(token)}`, baseURL).toString(),
        ),
      });
    }
  });
}
