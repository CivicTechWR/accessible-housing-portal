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

    // Delivery happens through the durable email job queue, so the invite can
    // exist while its email is still queued (or, rarely, dead-lettered).
    // Report what actually happened instead of assuming the email went out.
    if (result.value.data.emailDelivery === "failed") {
      return {
        status: "error",
        message: result.value.message,
      };
    }

    const status = result.value.data.emailDelivery === "queued" ? "queued" : "sent";

    return {
      status,
      message: result.value.message,
      invite: {
        id: result.value.data.id,
        email: result.value.data.email.trim().toLowerCase(),
        role: result.value.data.role,
        invitedAt: new Date().toISOString(),
        emailDelivery: status,
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
