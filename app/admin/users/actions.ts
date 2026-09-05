"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { userInvites, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireAdminSession } from "@/lib/auth/session";
import { createInvite } from "@/lib/auth/invite-service";
import { openEmailJobSecret } from "@/lib/email-queue/email-job";
import { updateAccountByIdService } from "@/lib/accounts/account.service";
import { updateAccountSchema } from "@/shared/schemas/account-management";

export async function saveAccountAction(accountId: string, formData: FormData) {
  if (!z.uuid().safeParse(accountId).success) return { error: "Invalid account." };
  const parsed = updateAccountSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    status: formData.get("status"),
    organization: String(formData.get("organization") ?? "").trim() || null,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid account details." };
  const result = await updateAccountByIdService({ accountId, payload: parsed.data });
  if (!result.ok) return { error: result.error.message };
  revalidatePath("/admin/users");
  return { message: "Account updated." };
}

export async function manageAccountAction(
  accountId: string,
  action: "invite" | "reset-password" | "revoke-sessions",
) {
  const guard = await requireAdminSession();
  if (guard.response) return { error: "Administrator access required." };
  if (!z.uuid().safeParse(accountId).success) return { error: "Invalid account." };
  const [user] = await db.select().from(users).where(eq(users.id, accountId));
  if (!user) return { error: "Account not found." };
  if (action === "invite") {
    if (user.status !== "invited" || user.inviteAcceptedAt)
      return { error: "Only invited accounts can receive a new invitation." };
    await createInvite({
      email: user.email,
      fullName: user.fullName,
      organization: user.organization,
      role: user.role,
      invitedByUserId: guard.authzUser.id,
      sendInviteEmail: true,
    });
  } else if (action === "reset-password") {
    if (user.status !== "active")
      return { error: "Only active accounts can receive a password reset." };
    await auth.api.requestPasswordReset({ body: { email: user.email } });
  } else if (action === "revoke-sessions") {
    const context = await auth.$context;
    await context.internalAdapter.deleteUserSessions(user.id);
  } else return { error: "Unknown action." };
  revalidatePath("/admin/users");
  revalidatePath("/admin/invite");
  return { message: action === "revoke-sessions" ? "All sessions revoked." : "Email queued." };
}

export async function manageInviteAction(inviteId: string, action: "copy" | "revoke" | "resend") {
  const guard = await requireAdminSession();
  if (guard.response) return { error: "Administrator access required." };
  if (!z.uuid().safeParse(inviteId).success) return { error: "Invalid invitation." };
  const [target] = await db
    .select({ invite: userInvites, user: users })
    .from(userInvites)
    .innerJoin(users, eq(users.id, userInvites.userId))
    .where(eq(userInvites.id, inviteId));
  if (!target || target.user.status !== "invited" || target.user.inviteAcceptedAt)
    return { error: "Invitation unavailable." };
  if (action === "resend") {
    await createInvite({
      email: target.user.email,
      fullName: target.user.fullName,
      organization: target.user.organization,
      role: target.user.role,
      invitedByUserId: guard.authzUser.id,
      sendInviteEmail: true,
    });
  } else if (action === "revoke") {
    await db.transaction(async (tx) => {
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, target.user.id))
        .for("update");
      await tx
        .update(userInvites)
        .set({ expiresAt: new Date(), revokedAt: new Date(), sealedUrl: null })
        .where(eq(userInvites.id, inviteId));
    });
  } else if (action === "copy") {
    if (
      target.invite.acceptedAt ||
      target.invite.revokedAt ||
      target.invite.expiresAt <= new Date() ||
      !target.invite.sealedUrl
    )
      return { error: "This invitation is no longer available. Send a new invitation." };
    return { url: openEmailJobSecret(target.invite.sealedUrl) };
  } else return { error: "Unknown action." };
  revalidatePath("/admin/users");
  revalidatePath("/admin/invite");
  return {
    message:
      action === "revoke"
        ? "Invitation revoked."
        : "New invitation queued. The previous link no longer works.",
  };
}
