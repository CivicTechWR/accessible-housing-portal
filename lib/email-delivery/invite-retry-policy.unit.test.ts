import { describe, expect, it } from "@jest/globals";

import {
  decideInviteRetry,
  type InviteRetryState,
  type ProviderEventReport,
} from "@/lib/email-delivery/invite-retry-policy";
import { formatOutcomeDetail } from "@/lib/email-delivery/outcome";

const NOW = new Date("2026-11-20T12:00:00.000Z");
const HOUR = 60 * 60 * 1_000;

function bounce(bounceType: string | null, bounceSubtype: string | null): ProviderEventReport {
  return { eventType: "email.bounced", bounceType, bounceSubtype };
}

/** An attempt whose stored outcome is the first of `events`, on a live seven-day invitation. */
function state(
  events: ProviderEventReport[] = [bounce("Transient", "MailboxFull")],
  overrides: Partial<InviteRetryState> = {},
): InviteRetryState {
  const [first] = events;
  return {
    attempt: {
      attemptNumber: 1,
      outcome: first?.eventType === "email.bounced" ? "bounced" : "sent",
      outcomeDetail: formatOutcomeDetail({
        bounceType: first?.bounceType ?? null,
        bounceSubtype: first?.bounceSubtype ?? null,
        failureReason: null,
        suppressionType: null,
      }),
    },
    events,
    invite: {
      acceptedAt: null,
      revokedAt: null,
      expiresAt: new Date(NOW.getTime() + 7 * 24 * HOUR),
      sealedUrl: "v1.sealed",
    },
    userStatus: "invited",
    ...overrides,
  };
}

describe("decideInviteRetry", () => {
  it.each([
    ["Transient", "General", true],
    ["Transient", "MailboxFull", true],
    ["Transient", "MessageTooLarge", false],
    ["Transient", "ContentRejected", false],
    ["Transient", "AttachmentRejected", false],
    ["Transient", "SomethingNew", false],
    ["Transient", null, false],
    ["Permanent", "General", false],
    ["Undetermined", "Undetermined", false],
    [null, null, false],
  ])("bounce %s/%s: retry %s", (bounceType, bounceSubtype, retry) => {
    expect(decideInviteRetry(state([bounce(bounceType, bounceSubtype)]), NOW).retry).toBe(retry);
  });

  it("backs off 4 hours, then 24, and stops at the attempt cap", () => {
    const after = (attemptNumber: number) => {
      const s = state();
      return decideInviteRetry({ ...s, attempt: { ...s.attempt, attemptNumber } }, NOW);
    };

    expect(after(1)).toMatchObject({
      retry: true,
      attemptNumber: 2,
      sendAt: new Date(NOW.getTime() + 4 * HOUR),
    });
    expect(after(2)).toMatchObject({
      retry: true,
      attemptNumber: 3,
      sendAt: new Date(NOW.getTime() + 24 * HOUR),
    });
    expect(after(3)).toEqual({ retry: false, reason: "attempt_cap_reached" });
  });

  it("does not retry when a later event contradicts the stored transient bounce", () => {
    // The attempt keeps the first bounce's detail, so only the event history shows these.
    for (const later of [
      bounce("Permanent", "General"),
      { eventType: "email.complained", bounceType: null, bounceSubtype: null } as const,
      { eventType: "email.suppressed", bounceType: null, bounceSubtype: null } as const,
      { eventType: "email.failed", bounceType: null, bounceSubtype: null } as const,
    ]) {
      expect(decideInviteRetry(state([bounce("Transient", "General"), later]), NOW)).toEqual({
        retry: false,
        reason: "bounce_not_recoverable",
      });
    }
  });

  it("retries a transient bounce that followed a delivery delay", () => {
    const delayed = {
      eventType: "email.delivery_delayed",
      bounceType: null,
      bounceSubtype: null,
    } as const;

    expect(decideInviteRetry(state([bounce("Transient", "General"), delayed]), NOW).retry).toBe(
      true,
    );
  });

  it("does not retry an attempt that is only delayed", () => {
    const s = state([]);
    const delayed = { ...s.attempt, outcome: "delivery_delayed" as const };

    expect(decideInviteRetry({ ...s, attempt: delayed }, NOW).retry).toBe(false);
  });

  it.each<[string, Partial<InviteRetryState>]>([
    ["accepted", { invite: { ...state().invite, acceptedAt: NOW } }],
    ["revoked", { invite: { ...state().invite, revokedAt: NOW } }],
    ["replaced or without a stored link", { invite: { ...state().invite, sealedUrl: null } }],
    ["expired", { invite: { ...state().invite, expiresAt: NOW } }],
    ["for an account that is no longer invited", { userStatus: "deactivated" }],
  ])("does not retry an invitation that is %s", (_name, overrides) => {
    expect(decideInviteRetry(state(undefined, overrides), NOW)).toEqual({
      retry: false,
      reason: "invite_unavailable",
    });
  });

  it("does not schedule a retry that would be sent after the invitation expires", () => {
    const expiresAt = new Date(NOW.getTime() + 4 * HOUR);

    expect(
      decideInviteRetry(state(undefined, { invite: { ...state().invite, expiresAt } }), NOW),
    ).toEqual({ retry: false, reason: "invite_expires_first" });
  });
});
