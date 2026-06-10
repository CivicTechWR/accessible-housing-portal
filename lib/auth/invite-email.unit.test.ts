import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { createResendClient, getEmailFromAddress } from "@/lib/email";
import { getAccountInviteEmailIdempotencyKey, sendInviteEmail } from "@/lib/auth/invite-email";

jest.mock("@/lib/email", () => ({
  createResendClient: jest.fn(),
  getEmailFromAddress: jest.fn(),
}));

const createResendClientMock = jest.mocked(createResendClient);
const getEmailFromAddressMock = jest.mocked(getEmailFromAddress);
const sendMock = jest.fn<(...args: unknown[]) => Promise<{ data: { id: string }; error: null }>>();

describe("getAccountInviteEmailIdempotencyKey", () => {
  it("uses the persisted invite id as the stable logical email key", () => {
    expect(getAccountInviteEmailIdempotencyKey("2e42f745-44e8-4ab7-a2a2-c1f42cc8e204")).toBe(
      "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
    );
  });
});

describe("sendInviteEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
    createResendClientMock.mockReset();
    createResendClientMock.mockReturnValue({
      emails: {
        send: sendMock,
      },
    } as unknown as ReturnType<typeof createResendClient>);
    getEmailFromAddressMock.mockReset();
    getEmailFromAddressMock.mockReturnValue("Affordable Housing Portal <no-reply@example.org>");
  });

  it("passes the invite idempotency key to Resend provider options", async () => {
    await sendInviteEmail({
      email: "tenant@example.org",
      fullName: "Tenant User",
      inviteUrl: "https://housing.example.org/invite?token=abc123",
      idempotencyKey: getAccountInviteEmailIdempotencyKey("2e42f745-44e8-4ab7-a2a2-c1f42cc8e204"),
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Affordable Housing Portal <no-reply@example.org>",
        to: "tenant@example.org",
        subject: "You’ve been invited to the Affordable Housing Portal",
      }),
      {
        idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
      },
    );
  });
});
