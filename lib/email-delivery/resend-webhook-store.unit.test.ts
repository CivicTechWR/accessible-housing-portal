/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { db } from "@/db";
import {
  pruneExpiredResendWebhookEvents,
  recordResendWebhookEvent,
} from "@/lib/email-delivery/resend-webhook-store";

jest.mock("@/db", () => ({ db: { delete: jest.fn(), insert: jest.fn() } }));

const insert = jest.mocked(db.insert);
const deleteRows = jest.mocked(db.delete);
const event = {
  svixId: "msg_webhook_123",
  eventType: "email.delivered",
  providerEmailId: "provider-email-123",
  eventCreatedAt: new Date("2026-09-23T14:30:00.000Z"),
};

beforeEach(() => {
  insert.mockReset();
  deleteRows.mockReset();
});

describe("pruneExpiredResendWebhookEvents", () => {
  it("deletes receipts older than 90 days and reports the count", async () => {
    const returning = jest.fn(async () => [{ svixId: "old-1" }, { svixId: "old-2" }]);
    const where = jest.fn(() => ({ returning }));
    deleteRows.mockReturnValue({ where } as never);

    await expect(
      pruneExpiredResendWebhookEvents(new Date("2026-09-23T12:00:00.000Z")),
    ).resolves.toBe(2);
    expect(deleteRows).toHaveBeenCalledTimes(1);
  });
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
