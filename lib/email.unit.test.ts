import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { Resend } from "resend";

import { sendTransactionalEmail } from "@/lib/email";

jest.mock("resend", () => ({
  Resend: jest.fn(),
}));

type SendResult = { data: { id: string } | null; error: { message: string } | null };

const sendMock = jest.fn<(...args: unknown[]) => Promise<SendResult>>();

// jest.mocked() insists the constructor returns a deeply mocked Resend; a
// structural cast keeps the stub minimal.
const resendConstructorMock = Resend as unknown as {
  mockImplementation(implementation: () => unknown): void;
};

const originalEnv = {
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
};

beforeEach(() => {
  jest.clearAllMocks();
  resendConstructorMock.mockImplementation(() => ({ emails: { send: sendMock } }));
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.EMAIL_FROM = "Affordable Housing Portal <no-reply@example.org>";
});

afterAll(() => {
  if (originalEnv.resendApiKey === undefined) {
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.RESEND_API_KEY = originalEnv.resendApiKey;
  }

  if (originalEnv.emailFrom === undefined) {
    delete process.env.EMAIL_FROM;
  } else {
    process.env.EMAIL_FROM = originalEnv.emailFrom;
  }
});

const SEND_PARAMS = {
  to: "tenant@example.org",
  subject: "You’ve been invited",
  text: "Hello",
  html: "<p>Hello</p>",
  idempotencyKey: "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
};

describe("sendTransactionalEmail", () => {
  it("forwards the idempotency key to Resend provider options", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });

    await expect(sendTransactionalEmail(SEND_PARAMS)).resolves.toBe("email_123");

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Affordable Housing Portal <no-reply@example.org>",
        to: "tenant@example.org",
        subject: "You’ve been invited",
      }),
      { idempotencyKey: SEND_PARAMS.idempotencyKey },
    );
  });

  it("throws when the provider reports an error", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "Invalid recipient" } });

    await expect(sendTransactionalEmail(SEND_PARAMS)).rejects.toThrow("Invalid recipient");
  });

  it("fails the attempt when the provider exceeds the send timeout", async () => {
    // A hanging connection: the SDK promise never settles.
    sendMock.mockImplementation(() => new Promise<never>(() => {}));

    await expect(sendTransactionalEmail({ ...SEND_PARAMS, timeoutMs: 25 })).rejects.toThrow(
      "Email provider did not respond within 25ms.",
    );
  });
});
