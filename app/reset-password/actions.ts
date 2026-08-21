"use server";

import { hashPassword } from "@/lib/auth/password";
import {
  consumePasswordResetToken,
  findUnconsumedPasswordResetToken,
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
    // A missing/empty hidden token means a malformed or stripped link — that
    // is an invalid link, not a fixable form field.
    const tokenInvalid = parsed.error.issues.some((issue) => issue.path.includes("token"));

    if (tokenInvalid) {
      return { error: INVALID_LINK_ERROR };
    }

    return {
      error: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromParsed(parsed.error),
    };
  }

  // Cheap lookup before scrypt so arbitrary-token requests can't exhaust the
  // crypto worker pool; the conditional UPDATE below remains the race check.
  const unconsumed = await findUnconsumedPasswordResetToken(parsed.data.token);

  if (!unconsumed) {
    return { error: INVALID_LINK_ERROR };
  }

  const newPasswordHash = await hashPassword(parsed.data.newPassword);

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
