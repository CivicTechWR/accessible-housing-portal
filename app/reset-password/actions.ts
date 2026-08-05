"use server";

import { hashPassword } from "@/lib/auth/password";
import {
  InvalidPasswordResetTokenError,
  verifyPasswordResetToken,
} from "@/lib/auth/password-reset-token";
import { getUserPasswordRecord, updateUserPasswordHash } from "@/lib/auth/user-store";
import { resetPasswordWithTokenSchema } from "@/lib/auth/validation";

export type ResetPasswordWithTokenState = {
  error: string;
  success: string;
};

export async function resetPasswordWithTokenAction(
  _state: ResetPasswordWithTokenState,
  formData: FormData,
): Promise<ResetPasswordWithTokenState> {
  const parsed = resetPasswordWithTokenSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid password reset details.",
      success: "",
    };
  }

  let tokenPayload;

  try {
    tokenPayload = verifyPasswordResetToken(parsed.data.token);
  } catch (error) {
    if (error instanceof InvalidPasswordResetTokenError) {
      return {
        error: "This password reset link is invalid or has expired.",
        success: "",
      };
    }

    throw error;
  }

  const userRecord = await getUserPasswordRecord(tokenPayload.userId);

  if (!userRecord?.passwordHash || userRecord.passwordHash !== tokenPayload.passwordHash) {
    return {
      error: "This password reset link is invalid or has expired.",
      success: "",
    };
  }

  const newPasswordHash = await hashPassword(parsed.data.newPassword);
  await updateUserPasswordHash(userRecord.id, newPasswordHash);

  return {
    error: "",
    success: "Password updated successfully. You can now sign in.",
  };
}