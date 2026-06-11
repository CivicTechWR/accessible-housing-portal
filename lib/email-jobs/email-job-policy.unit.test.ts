import { describe, expect, it } from "@jest/globals";

import {
  getProcessingClaimCutoffs,
  getRetryDelayMs,
  sanitizeEmailJobError,
} from "./email-job-policy";

const NO_JITTER = () => 0.5;

describe("getProcessingClaimCutoffs", () => {
  it("reclaims expired leases only inside the provider idempotency safety window", () => {
    const now = new Date("2026-06-11T12:00:00.000Z");

    expect(getProcessingClaimCutoffs(now)).toEqual({
      leaseExpiredAtOrBefore: new Date("2026-06-11T11:50:00.000Z"),
      staleAtOrBefore: new Date("2026-06-10T13:00:00.000Z"),
    });
  });
});

describe("getRetryDelayMs", () => {
  it("doubles the delay per attempt starting at 30 seconds", () => {
    expect(getRetryDelayMs(1, NO_JITTER)).toBe(30_000);
    expect(getRetryDelayMs(2, NO_JITTER)).toBe(60_000);
    expect(getRetryDelayMs(3, NO_JITTER)).toBe(120_000);
    expect(getRetryDelayMs(4, NO_JITTER)).toBe(240_000);
  });

  it("caps the delay at 30 minutes", () => {
    expect(getRetryDelayMs(7, NO_JITTER)).toBe(30 * 60 * 1000);
    expect(getRetryDelayMs(50, NO_JITTER)).toBe(30 * 60 * 1000);
  });

  it("applies bounded jitter of ±20%", () => {
    expect(getRetryDelayMs(1, () => 0)).toBe(24_000);
    expect(getRetryDelayMs(1, () => 1)).toBe(36_000);
  });
});

describe("sanitizeEmailJobError", () => {
  it("redacts one-time tokens embedded in error messages", () => {
    const error = new Error(
      'Failed to send: invalid url "https://example.org/invite?token=abc123&x=1"',
    );

    const sanitized = sanitizeEmailJobError(error);

    expect(sanitized).not.toContain("abc123");
    expect(sanitized).toContain("token=[redacted]");
  });

  it("truncates very long messages", () => {
    const sanitized = sanitizeEmailJobError(new Error("x".repeat(2_000)));

    expect(sanitized).toHaveLength(500);
  });

  it("stringifies non-Error values", () => {
    expect(sanitizeEmailJobError("plain failure")).toBe("plain failure");
  });
});
