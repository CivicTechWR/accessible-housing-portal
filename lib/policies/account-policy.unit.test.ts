import { expect, it } from "@jest/globals";

import { canDeactivateAccount, canRetainOwnAdminAccess } from "./account-policy";

const ACTOR_ID = "abcdefab-1234-4123-8123-abcdefabcdef";

it("rejects self-deactivation and self-demotion with case-variant UUIDs", () => {
  const identity = { actorUserId: ACTOR_ID, targetUserId: ACTOR_ID.toUpperCase() };

  expect(canDeactivateAccount(identity)).toBe(false);
  expect(canRetainOwnAdminAccess({ ...identity, nextRole: "partner", nextStatus: "active" })).toBe(
    false,
  );
  expect(
    canRetainOwnAdminAccess({ ...identity, nextRole: "admin", nextStatus: "deactivated" }),
  ).toBe(false);
  expect(canRetainOwnAdminAccess({ ...identity, nextRole: "admin", nextStatus: "active" })).toBe(
    true,
  );
});
