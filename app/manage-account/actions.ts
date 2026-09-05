"use server";

import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { updateUserPasswordExpiringResets } from "@/lib/auth/password-reset-service";
import { getOptionalSession } from "@/lib/auth/session";
import { getUserPasswordRecord } from "@/lib/auth/user-store";
import { resetPasswordSchema } from "@/lib/auth/validation";

export type ManageAccountField = "currentPassword" | "newPassword" | "confirmNewPassword";

export type ManageAccountState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<ManageAccountField, string[]>>;
};

export async function resetPasswordAction(
  _state: ManageAccountState,
  formData: FormData,
): Promise<ManageAccountState> {
  const { session } = await getOptionalSession(await auth());

  if (!session?.user?.id) {
    return { error: "You must be signed in to reset your password." };
  }

  const parsed = resetPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    const fieldErrors: NonNullable<ManageAccountState["fieldErrors"]> = {};

    for (const field of ["currentPassword", "newPassword", "confirmNewPassword"] as const) {
      const messages = flattened[field];

      if (messages && messages.length > 0) {
        fieldErrors[field] = messages;
      }
    }

    return {
      error: "Please fix the errors below.",
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    };
  }

  const userRecord = await getUserPasswordRecord(session.user.id);

  if (!userRecord?.passwordHash) {
    return { error: "Unable to reset password for this account." };
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
    // Field error only — a banner would repeat the same text twice.
    return { fieldErrors: { currentPassword: ["Current password is incorrect."] } };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  // Update the password and expire every outstanding reset link in one
  // transaction so an older reset email cannot overwrite the new password.
  await updateUserPasswordExpiringResets({ userId: userRecord.id, passwordHash });

  return { success: "Password updated successfully." };
}
