"use server";

import { hashPassword } from "@/lib/auth/password";
import {
  consumePasswordResetToken,
  PasswordResetUnavailableError,
} from "@/lib/auth/password-reset-service";
import { resetPasswordWithTokenSchema } from "@/lib/auth/validation";

export type ResetPasswordWithTokenField = "newPassword" | "confirmNewPassword";

export type ResetPasswordWithTokenState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<ResetPasswordWithTokenField, string[]>>;
};

const INVALID_LINK_ERROR = "This password reset link is invalid or has expired.";

function fieldErrorsFromParsed(
  error: import("zod").ZodError,
): ResetPasswordWithTokenState["fieldErrors"] {
  const flattened = error.flatten().fieldErrors as Partial<
    Record<ResetPasswordWithTokenField, string[] | undefined>
  >;
  const fieldErrors: NonNullable<ResetPasswordWithTokenState["fieldErrors"]> = {};

  for (const field of ["newPassword", "confirmNewPassword"] as const) {
    const messages = flattened[field];

    if (messages && messages.length > 0) {
      fieldErrors[field] = messages;
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

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
      error: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromParsed(parsed.error),
    };
  }

  const newPasswordHash = await hashPassword(parsed.data.newPassword);

  // Atomic single-use consumption: only an unused, unexpired token row can be
  // claimed; the new password is written in the same transaction. Outstanding
  // tokens are expired when a new one is requested, so no staleness check
  // against the current password hash is needed.
  try {
    await consumePasswordResetToken({
      token: parsed.data.token,
      passwordHash: newPasswordHash,
    });
  } catch (error) {
    if (error instanceof PasswordResetUnavailableError) {
      return { error: INVALID_LINK_ERROR };
    }

    throw error;
  }

  return { success: "Password updated successfully. You can now sign in." };
}
