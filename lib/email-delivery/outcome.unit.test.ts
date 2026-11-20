/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import type { EmailDeliveryOutcome } from "@/db/schema";
import {
  formatOutcomeDetail,
  parseOutcomeDetail,
  shouldApplyProviderOutcome,
  type ProviderOutcome,
} from "@/lib/email-delivery/outcome";

function settle(reported: readonly ProviderOutcome[]) {
  return reported.reduce<EmailDeliveryOutcome>(
    (current, next) => (shouldApplyProviderOutcome(current, next) ? next : current),
    "sent",
  );
}

describe("shouldApplyProviderOutcome", () => {
  it.each<[ProviderOutcome[], ProviderOutcome]>([
    [["delivery_delayed", "delivered"], "delivered"],
    [["delivery_delayed", "failed"], "failed"],
    [["delivered", "bounced"], "bounced"],
    [["delivered", "complained"], "complained"],
    [["bounced", "complained"], "complained"],
    [["failed", "bounced"], "bounced"],
    [["bounced", "suppressed"], "suppressed"],
  ])("settles %j as %s in either order", (reported, expected) => {
    expect(settle(reported)).toBe(expected);
    expect(settle(reported.toReversed())).toBe(expected);
  });

  it("ignores an event that reports the current outcome again", () => {
    expect(shouldApplyProviderOutcome("bounced", "bounced")).toBe(false);
  });
});

describe("outcome detail", () => {
  it("stores short provider codes and drops anything else", () => {
    const detail = formatOutcomeDetail({
      bounceType: "Permanent",
      bounceSubtype: "550 mailbox resident@example.net unknown",
      failureReason: null,
      suppressionType: null,
    });

    expect(detail).toBe('{"bounceType":"Permanent"}');
    expect(parseOutcomeDetail(detail)).toEqual({ bounceType: "Permanent" });
  });

  it("stores nothing when the event carries no codes", () => {
    expect(
      formatOutcomeDetail({
        bounceType: null,
        bounceSubtype: null,
        failureReason: null,
        suppressionType: null,
      }),
    ).toBeNull();
  });

  it("reads stored detail it cannot trust as empty", () => {
    expect(parseOutcomeDetail("not json")).toEqual({});
    expect(
      parseOutcomeDetail('{"failureReason":"Quota reached for resident@example.net"}'),
    ).toEqual({});
  });
});
