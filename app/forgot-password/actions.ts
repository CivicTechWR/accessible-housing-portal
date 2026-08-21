"use server";

import { getUserForAuth, isUserAllowedToSignIn } from "@/lib/auth/user-store";
import {
  countRecentPasswordResets,
  createPasswordReset,
  PASSWORD_RESET_MAX_PER_HOUR,
} from "@/lib/auth/password-reset-service";
import { forgotPasswordRequestSchema } from "@/lib/auth/validation";

export type ForgotPasswordState = {
  error?: string;
  success?: string;
};

const SUCCESS_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

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

  // Every path below returns the same neutral message so the form can never
  // reveal whether an account exists.
  if (!user?.passwordHash || !isUserAllowedToSignIn(user.status)) {
    return { success: SUCCESS_MESSAGE };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await countRecentPasswordResets({ userId: user.id, since: hourAgo });

  if (recentCount >= PASSWORD_RESET_MAX_PER_HOUR) {
    return { success: SUCCESS_MESSAGE };
  }

  // The service expires outstanding tokens and enqueues the email in one
  // transaction. Enqueue failures here are transient infrastructure issues;
  // surfacing them would leak account existence, so log and stay neutral.
  try {
    await createPasswordReset({ userId: user.id });
  } catch (error) {
    console.error("[forgot-password] Failed to create password reset request:", error);
  }

  return { success: SUCCESS_MESSAGE };
}
