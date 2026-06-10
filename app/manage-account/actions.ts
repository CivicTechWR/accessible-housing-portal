"use server";

import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getOptionalSession } from "@/lib/auth/session";
import { getUserPasswordRecord, updateUserPasswordHash } from "@/lib/auth/user-store";
import { resetPasswordSchema } from "@/lib/auth/validation";

export type ManageAccountState = {
  error: string;
  success: string;
};

export async function resetPasswordAction(
  _state: ManageAccountState,
  formData: FormData,
): Promise<ManageAccountState> {
  const { session } = await getOptionalSession(await auth());

  if (!session?.user?.id) {
    return {
      error: "You must be signed in to reset your password.",
      success: "",
    };
  }

  const parsed = resetPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid password details.",
      success: "",
    };
  }

  const userRecord = await getUserPasswordRecord(session.user.id);

  if (!userRecord?.passwordHash) {
    return {
      error: "Unable to reset password for this account.",
      success: "",
    };
  }

  let currentPasswordMatches = false;

  try {
    currentPasswordMatches = await verifyPassword(
      parsed.data.currentPassword,
      userRecord.passwordHash,
    );
  } catch {
    currentPasswordMatches = false;
  }

  if (!currentPasswordMatches) {
    return {
      error: "Current password is incorrect.",
      success: "",
    };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await updateUserPasswordHash(userRecord.id, passwordHash);

  return {
    error: "",
    success: "Password updated successfully.",
  };
}