import { describe, expect, it } from "@jest/globals";

import { requiresAuthSessionForRequest } from "@/lib/auth/route-policy";

describe("requiresAuthSessionForRequest", () => {
  it.each([
    ["/admin", "GET", true],
    ["/admin/users", "GET", true],
    ["/listings", "GET", true],
    ["/listings/abc123", "GET", true],
    ["/listing-form", "GET", true],
    ["/listing-form/abc123", "GET", true],
    ["/my-listings", "GET", true],
    ["/my-listings/drafts", "GET", true],
    ["/api/admin/accounts", "GET", true],
    ["/api/listings", "GET", true],
    ["/api/listings/abc123", "GET", true],
    ["/api/listings", "POST", true],
    ["/api/listings/abc123", "PUT", true],
    // Similar public paths must not match a protected prefix.
    ["/administrator", "GET", false],
    ["/listings-extra", "GET", false],
    ["/listing-formal", "GET", false],
    ["/my-listings-archive", "GET", false],
    ["/api/administer", "GET", false],
    ["/api/listings-extra", "POST", false],
  ])("%s %s requires a session: %s", (pathname, method, expected) => {
    expect(requiresAuthSessionForRequest({ pathname, method })).toBe(expected);
  });
});
