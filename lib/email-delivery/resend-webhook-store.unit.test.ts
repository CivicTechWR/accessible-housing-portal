/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { db } from "@/db";
import { recordResendWebhookEvent } from "@/lib/email-delivery/resend-webhook-store";

jest.mock("@/db", () => ({ db: { insert: jest.fn() } }));

const insert = jest.mocked(db.insert);
const event = {
  svixId: "msg_webhook_123",
  eventType: "email.delivered",
  providerEmailId: "provider-email-123",
  eventCreatedAt: new Date("2026-09-23T14:30:00.000Z"),
};

beforeEach(() => {
  insert.mockReset();
});

describe("recordResendWebhookEvent", () => {
  it.each([
    [[{ svixId: event.svixId }], "recorded"],
    [[], "duplicate"],
  ] as const)("maps the insert result to %s", async (rows, expected) => {
    const returning = jest.fn(async () => rows);
    const onConflictDoNothing = jest.fn(() => ({ returning }));
    const values = jest.fn(() => ({ onConflictDoNothing }));
    insert.mockReturnValue({ values } as never);

    await expect(recordResendWebhookEvent(event)).resolves.toBe(expected);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
