"use server";

import { getUserForAuth, isUserAllowedToSignIn } from "@/lib/auth/user-store";
import { createPasswordReset } from "@/lib/auth/password-reset-service";
import { ensureMinimumElapsed } from "@/app/forgot-password/neutral-response";
import { forgotPasswordRequestSchema } from "@/lib/auth/validation";

export type ForgotPasswordState = {
  error?: string;
  success?: string;
};

const SUCCESS_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

/**
 * Neutral (success-shaped) responses are padded to a common minimum duration
 * by app/forgot-password/neutral-response.ts: unknown and inactive accounts
 * return after a single cheap query while real accounts run a locked
 * transaction plus a queue enqueue, and padding keeps response timing from
 * distinguishing existing accounts. This narrows, but cannot fully eliminate,
 * the signal — per-IP rate limiting on this endpoint remains a follow-up.
 */
export async function requestPasswordResetAction(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const startedAt = Date.now();

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

  // Every path below returns the same neutral message after comparable work,
  // so the form can never reveal whether an account exists.
  if (!user?.passwordHash || !isUserAllowedToSignIn(user.status)) {
    await ensureMinimumElapsed(startedAt);
    return { success: SUCCESS_MESSAGE };
  }

  // Creates the request under a per-user lock: throttle check, expiry of
  // outstanding tokens, insert, and email enqueue all happen inside one
  // serialized transaction. Enqueue failures here are transient
  // infrastructure issues; surfacing them would leak account existence, so
  // log and stay neutral either way.
  try {
    await createPasswordReset({ userId: user.id });
  } catch (error) {
    console.error("[forgot-password] Failed to create password reset request:", error);
  }

  await ensureMinimumElapsed(startedAt);
  return { success: SUCCESS_MESSAGE };
}
