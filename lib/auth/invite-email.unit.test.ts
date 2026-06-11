import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getAccountInviteEmailIdempotencyKey, sendInviteEmail } from "@/lib/auth/invite-email";
import { sendEmail } from "@/lib/email";

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(),
}));

const sendEmailMock = jest.mocked(sendEmail);

describe("getAccountInviteEmailIdempotencyKey", () => {
  it("uses the persisted invite id as the stable logical email key", () => {
    expect(getAccountInviteEmailIdempotencyKey("2e42f745-44e8-4ab7-a2a2-c1f42cc8e204")).toBe(
      "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
    );
  });
});

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
      idempotencyKey: getAccountInviteEmailIdempotencyKey("2e42f745-44e8-4ab7-a2a2-c1f42cc8e204"),
    });

    expect(sendEmailMock).toHaveBeenCalledWith({
      to: "tenant@example.org",
      subject: "You’ve been invited to the Affordable Housing Portal",
      text: expect.stringContaining("https://housing.example.org/invite?token=abc123"),
      html: expect.stringContaining("https://housing.example.org/invite?token=abc123"),
      idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
    });
  });

  it("rejects invite URLs that are not http or https", async () => {
    await expect(
      sendInviteEmail({
        email: "tenant@example.org",
        fullName: "Tenant User",
        // oxlint-disable-next-line no-script-url
        inviteUrl: "javascript:alert(1)",
        idempotencyKey: getAccountInviteEmailIdempotencyKey("2e42f745-44e8-4ab7-a2a2-c1f42cc8e204"),
      }),
    ).rejects.toThrow("Invite URL must use http or https.");

    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
