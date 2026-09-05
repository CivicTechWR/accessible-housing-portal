import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lower, users, type UserRole } from "@/db/schema";
import { auth } from "@/lib/auth";
import { invitationEmailContext } from "@/lib/auth/invite-context";

export async function createInvite(params: {
  email: string;
  fullName: string;
  role: UserRole;
  organization: string | null;
  invitedByUserId: string;
  sendInviteEmail: boolean;
}) {
  const email = params.email.trim().toLowerCase();
  const user = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(users)
      .where(eq(lower(users.email), email))
      .for("update");
    if (existing && (existing.status !== "invited" || existing.inviteAcceptedAt)) {
      throw new Error("This account already exists. Manage its access from the users page.");
    }
    const values = {
      email,
      fullName: params.fullName,
      role: params.role,
      organization: params.organization,
      status: "invited" as const,
    };
    const [result] = existing
      ? await tx.update(users).set(values).where(eq(users.id, existing.id)).returning()
      : await tx.insert(users).values(values).returning();
    return result;
  });
  if (!user) throw new Error("Unable to create account.");
  const context = {
    userId: user.id,
    invitedByUserId: params.invitedByUserId,
    sendEmail: params.sendInviteEmail,
    inviteUrl: undefined as string | undefined,
    inviteId: undefined as string | undefined,
  };
  await invitationEmailContext.run(context, () =>
    auth.api.requestPasswordReset({ body: { email } }),
  );
  if (!context.inviteUrl || !context.inviteId) throw new Error("Unable to create invitation.");
  return {
    userId: user.id,
    email,
    organization: params.organization,
    inviteUrl: context.inviteUrl,
    inviteId: context.inviteId,
  };
}
