import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { sendInviteEmail } from "@/lib/auth/invite-email";
import type { EmailDeliveryAttemptRef } from "@/lib/email-delivery/attempt";
import { sendEmail } from "@/lib/email";

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(),
}));

const sendEmailMock = jest.mocked(sendEmail);

const ATTEMPT: EmailDeliveryAttemptRef = {
  id: "0f5cce0c-92e5-4ab0-a06d-21c5a8f4ff79",
  deliveryId: "6d5a1a9a-8f1f-4d1e-9a2e-3b0f5a2c7d11",
  emailType: "account_invite",
  attemptNumber: 1,
  idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204/attempt/1",
};

describe("sendInviteEmail", () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
    sendEmailMock.mockResolvedValue({ id: "email_123" });
  });

  it("sends the composed invite email through the shared email service", async () => {
    await sendInviteEmail({
      email: "tenant@example.org",
      fullName: "Tenant User",
      inviteUrl: "https://housing.example.org/invite?token=abc123",
      attempt: ATTEMPT,
    });

    expect(sendEmailMock).toHaveBeenCalledWith({
      to: "tenant@example.org",
      subject: "You’ve been invited to the Affordable Housing Portal",
      text: expect.stringContaining("https://housing.example.org/invite?token=abc123"),
      html: expect.stringContaining("https://housing.example.org/invite?token=abc123"),
      attempt: ATTEMPT,
    });
  });

  it("rejects invite URLs that are not http or https", async () => {
    await expect(
      sendInviteEmail({
        email: "tenant@example.org",
        fullName: "Tenant User",
        // oxlint-disable-next-line no-script-url
        inviteUrl: "javascript:alert(1)",
        attempt: ATTEMPT,
      }),
    ).rejects.toThrow("Invite URL must use http or https.");

    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
