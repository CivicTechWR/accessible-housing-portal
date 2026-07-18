"use server";

import { createAccountService } from "@/lib/accounts/account.service";
import type { InviteActionResult } from "@/components/admin-invite/types";
import { createAccountInviteSchema } from "@/shared/schemas/account-management";

export type SendAdminInviteActionState =
  | {
      status: "idle";
      message: string;
      invite?: undefined;
    }
  | InviteActionResult;

function normalizeOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function sendAdminInviteAction(
  _state: SendAdminInviteActionState,
  formData: FormData,
): Promise<SendAdminInviteActionState> {
  try {
    const rawValues = {
      email: formData.get("email"),
      name: formData.get("name"),
      role: formData.get("role"),
      organization: normalizeOptionalString(formData.get("organization")),
      sendInviteEmail: true,
    };

    const parsed = createAccountInviteSchema.safeParse(rawValues);

    if (!parsed.success) {
      return {
        status: "error",
        message: parsed.error.issues[0]?.message ?? "Invalid invite details.",
      };
    }

    const result = await createAccountService(parsed.data);

    if (!result.ok) {
      return {
        status: "error",
        message: result.error.message,
      };
    }

    return {
      status: "queued",
      message: result.value.message,
      invite: {
        id: result.value.data.id,
        email: result.value.data.email.trim().toLowerCase(),
        role: result.value.data.role,
        invitedAt: new Date().toISOString(),
        status: "queued",
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Unable to send the invite right now.",
    };
  }
}
