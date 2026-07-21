"use server";

import { getUserForAuth, isUserAllowedToSignIn } from "@/lib/auth/user-store";
import { sendPasswordResetEmail } from "@/lib/auth/password-reset-email";
import { createPasswordResetToken } from "@/lib/auth/password-reset-token";
import { forgotPasswordRequestSchema } from "@/lib/auth/validation";

export type ForgotPasswordState = {
  error: string;
  success: string;
};

const SUCCESS_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export async function requestPasswordResetAction(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid email address.",
      success: "",
    };
  }

  const user = await getUserForAuth(parsed.data.email);

  if (!user?.passwordHash || !isUserAllowedToSignIn(user.status)) {
    return {
      error: "",
      success: SUCCESS_MESSAGE,
    };
  }

  const token = createPasswordResetToken({
    userId: user.id,
    passwordHash: user.passwordHash,
  });
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = new URL(`/reset-password?token=${token}`, baseUrl).toString();

  try {
    await sendPasswordResetEmail({
      email: user.email,
      fullName: user.fullName,
      resetUrl,
    });
  } catch {
    return {
      error: "Unable to send reset email right now.",
      success: "",
    };
  }

  return {
    error: "",
    success: SUCCESS_MESSAGE,
  };
}