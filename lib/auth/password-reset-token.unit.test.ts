import { describe, expect, it } from "@jest/globals";

import {
  createPasswordResetToken,
  InvalidPasswordResetTokenError,
  verifyPasswordResetToken,
} from "@/lib/auth/password-reset-token";

describe("password-reset-token", () => {
  it("round-trips a valid token", () => {
    process.env.AUTH_SECRET = "test-auth-secret";

    const token = createPasswordResetToken({
      userId: "user-123",
      passwordHash: "hash-abc",
      ttlSeconds: 60,
    });

    const payload = verifyPasswordResetToken(token);

    expect(payload.userId).toBe("user-123");
    expect(payload.passwordHash).toBe("hash-abc");
    expect(typeof payload.exp).toBe("number");
  });

  it("rejects malformed tokens", () => {
    process.env.AUTH_SECRET = "test-auth-secret";

    expect(() => verifyPasswordResetToken("not-a-token")).toThrow(InvalidPasswordResetTokenError);
  });

  it("rejects expired tokens", () => {
    process.env.AUTH_SECRET = "test-auth-secret";

    const token = createPasswordResetToken({
      userId: "user-123",
      passwordHash: "hash-abc",
      ttlSeconds: -1,
    });

    expect(() => verifyPasswordResetToken(token)).toThrow(InvalidPasswordResetTokenError);
  });
});