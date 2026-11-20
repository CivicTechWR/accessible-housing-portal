import { describe, expect, it } from "@jest/globals";

import {
  getInviteEmailStatus,
  type InviteEmailAttempt,
  type InviteEmailHistory,
} from "@/lib/email-delivery/invite-email-status";
import type { ProviderEventReport } from "@/lib/email-delivery/invite-retry-policy";

const NOW = new Date("2026-11-20T12:00:00.000Z");
const HOUR = 60 * 60 * 1_000;
const MAILBOX_FULL = { bounceType: "Transient", bounceSubtype: "MailboxFull" };
const NO_SUCH_ADDRESS = { bounceType: "Permanent", bounceSubtype: "General" };

function attempt(
  attemptNumber: number,
  outcome: InviteEmailAttempt["outcome"],
  detail?: Record<string, string>,
): InviteEmailAttempt {
  return {
    attemptNumber,
    outcome,
    // The provider's outcomes carry its event time. `queued` and `sent` are the application's.
    outcomeAt: outcome === "queued" || outcome === "sent" ? null : NOW,
    outcomeDetail: detail ? JSON.stringify(detail) : null,
  };
}

/** An attempt the queue worker ended without the provider saying anything. */
function unsent(
  attemptNumber: number,
  outcome: "failed" | "suppressed",
  skipReason?: string,
): InviteEmailAttempt {
  return {
    ...attempt(attemptNumber, outcome, skipReason ? { skipReason } : undefined),
    outcomeAt: null,
  };
}

function bounce(codes: typeof MAILBOX_FULL): ProviderEventReport {
  return { eventType: "email.bounced", ...codes };
}

const DELIVERED: ProviderEventReport = { eventType: "email.delivered" };

/** The status of a usable invitation that expires in seven days. */
function status(
  attempts: InviteEmailAttempt[],
  events: ProviderEventReport[] = [],
  overrides: Partial<InviteEmailHistory> = {},
) {
  return getInviteEmailStatus(
    {
      invite: {
        acceptedAt: null,
        revokedAt: null,
        expiresAt: new Date(NOW.getTime() + 7 * 24 * HOUR),
        sealedUrl: "v1.sealed",
      },
      userStatus: "invited",
      attempts,
      events,
      ...overrides,
    },
    NOW,
  );
}

describe("getInviteEmailStatus", () => {
  it("follows an email from the queue to confirmed delivery", () => {
    expect(status([])).toEqual({ state: "not_requested" });
    expect(status([attempt(1, "queued")])).toEqual({ state: "queued" });
    expect(status([attempt(1, "sent")])).toEqual({ state: "submitted", attemptNumber: 1 });
    expect(status([attempt(1, "delivery_delayed")])).toEqual({ state: "delayed" });
    expect(status([attempt(1, "delivered")], [DELIVERED])).toEqual({
      state: "delivered",
      bounceReported: false,
    });
  });

  it("promises a retry after a recoverable bounce, before and after it is scheduled", () => {
    const bounced = attempt(1, "bounced", MAILBOX_FULL);
    const events = [bounce(MAILBOX_FULL)];
    const retrying = { state: "retrying", attemptNumber: 2 };

    expect(status([bounced], events)).toEqual(retrying);
    expect(status([bounced, attempt(2, "queued")], events)).toEqual(retrying);
    expect(status([bounced, attempt(2, "sent")], events)).toEqual({
      state: "submitted",
      attemptNumber: 2,
    });
    expect(status([bounced, attempt(2, "delivered")], [...events, DELIVERED])).toEqual({
      state: "delivered",
      bounceReported: false,
    });
  });

  it("stops promising a retry once none will be sent", () => {
    const bounced = (attemptNumber: number) => attempt(attemptNumber, "bounced", MAILBOX_FULL);
    const events = [bounce(MAILBOX_FULL)];

    expect(status([bounced(1), bounced(2), bounced(3)], events)).toEqual({
      state: "failed",
      reason: "retries_used_up",
    });

    // The retry would be due after the invitation expires.
    const expiresSoon = {
      acceptedAt: null,
      revokedAt: null,
      expiresAt: new Date(NOW.getTime() + 2 * HOUR),
      sealedUrl: "v1.sealed",
    };
    expect(status([bounced(1)], events, { invite: expiresSoon })).toEqual({
      state: "failed",
      reason: "bounced",
    });

    // A second report during the backoff rules the waiting retry out.
    const rejected = { bounceType: "Transient", bounceSubtype: "ContentRejected" };
    expect(status([bounced(1), attempt(2, "queued")], [...events, bounce(rejected)])).toEqual({
      state: "failed",
      reason: "bounced",
    });
  });

  it("tells a bounce that is not retried from an address that does not accept mail", () => {
    const tooLarge = { bounceType: "Transient", bounceSubtype: "MessageTooLarge" };

    expect(status([attempt(1, "bounced", tooLarge)], [bounce(tooLarge)])).toEqual({
      state: "failed",
      reason: "bounced",
    });
    expect(status([attempt(1, "bounced", NO_SUCH_ADDRESS)], [bounce(NO_SUCH_ADDRESS)])).toEqual({
      state: "failed",
      reason: "permanent_bounce",
    });
  });

  it("counts a delivered email as delivered when a bounce that is not permanent hides it", () => {
    const delivered = { state: "delivered", bounceReported: true };
    const bounced = attempt(1, "bounced", MAILBOX_FULL);
    const events = [DELIVERED, bounce(MAILBOX_FULL)];

    expect(status([bounced], events)).toEqual(delivered);
    // The retry was already waiting when the `delivered` event arrived.
    expect(status([bounced, attempt(2, "queued")], events)).toEqual(delivered);
    expect(status([bounced, unsent(2, "suppressed", "already_delivered")], events)).toEqual(
      delivered,
    );
  });

  it("reports a permanent bounce even after the mail server accepted the email", () => {
    expect(
      status([attempt(1, "bounced", NO_SUCH_ADDRESS)], [DELIVERED, bounce(NO_SUCH_ADDRESS)]),
    ).toEqual({ state: "failed", reason: "permanent_bounce" });
  });

  it("tells the provider's failures from the queue worker's", () => {
    expect(status([attempt(1, "failed", { failureReason: "reached_daily_quota" })])).toEqual({
      state: "failed",
      reason: "provider_failed",
    });
    expect(
      status([attempt(1, "suppressed", { suppressionType: "OnAccountSuppressionList" })]),
    ).toEqual({ state: "failed", reason: "address_suppressed" });

    // Dead-lettered send jobs: the first email, and an automatic retry.
    const bounced = attempt(1, "bounced", MAILBOX_FULL);
    expect(status([unsent(1, "failed")])).toEqual({ state: "failed", reason: "send_failed" });
    expect(status([bounced, unsent(2, "failed")], [bounce(MAILBOX_FULL)])).toEqual({
      state: "failed",
      reason: "send_failed",
    });

    // A retry the worker chose not to send says nothing about the address.
    expect(
      status([bounced, unsent(2, "suppressed", "bounce_not_recoverable")], [bounce(MAILBOX_FULL)]),
    ).toEqual({ state: "failed", reason: "bounced" });
  });

  it("reports a complaint even though the email was delivered", () => {
    expect(
      status([attempt(1, "complained")], [DELIVERED, { eventType: "email.complained" }]),
    ).toEqual({ state: "complained" });
  });

  it.each([
    ["accepted", { acceptedAt: NOW }, "active"],
    ["revoked", { revokedAt: NOW }, "invited"],
    ["replaced or expired", { expiresAt: NOW, sealedUrl: null }, "invited"],
  ] as const)("has nothing to report for an %s invitation", (_name, changes, userStatus) => {
    const invite = {
      acceptedAt: null,
      revokedAt: null,
      expiresAt: new Date(NOW.getTime() + 24 * HOUR),
      sealedUrl: "v1.sealed",
      ...changes,
    };

    expect(
      status([attempt(1, "bounced", NO_SUCH_ADDRESS)], [bounce(NO_SUCH_ADDRESS)], {
        invite,
        userStatus,
      }),
    ).toBeNull();
  });
});
