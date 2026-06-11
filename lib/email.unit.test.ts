import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Resend } from "resend";

import { sendEmail } from "@/lib/email";

const sendMock =
  jest.fn<
    (
      ...args: unknown[]
    ) => Promise<{ data: { id: string } | null; error: { message: string } | null }>
  >();

jest.mock("resend", () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: (...args: unknown[]) => sendMock(...args),
    },
  })),
}));

const ResendMock = jest.mocked(Resend);

const ORIGINAL_ENV = process.env;

describe("sendEmail", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      RESEND_API_KEY: "re_test_key",
      EMAIL_FROM: "Affordable Housing Portal <no-reply@example.org>",
    };
    ResendMock.mockClear();
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("sends through Resend with the configured sender and the idempotency key in provider options", async () => {
    const result = await sendEmail({
      to: "tenant@example.org",
      subject: "Subject line",
      text: "Plain text body",
      html: "<p>HTML body</p>",
      idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
    });

    expect(ResendMock).toHaveBeenCalledWith("re_test_key");
    expect(sendMock).toHaveBeenCalledWith(
      {
        from: "Affordable Housing Portal <no-reply@example.org>",
        to: "tenant@example.org",
        subject: "Subject line",
        text: "Plain text body",
        html: "<p>HTML body</p>",
      },
      {
        idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
      },
    );
    expect(result).toEqual({ id: "email_123" });
  });

  it("surfaces provider errors to the caller", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Daily quota exceeded" },
    });

    await expect(
      sendEmail({
        to: "tenant@example.org",
        subject: "Subject line",
        text: "Plain text body",
        html: "<p>HTML body</p>",
        idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
      }),
    ).rejects.toThrow("Daily quota exceeded");
  });
});
