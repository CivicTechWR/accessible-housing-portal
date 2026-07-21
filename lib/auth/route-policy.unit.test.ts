import { describe, expect, it } from "@jest/globals";

import { requiresAuthSessionForRequest } from "@/lib/auth/route-policy";

describe("requiresAuthSessionForRequest", () => {
  it("requires auth for protected page route families", () => {
    expect(requiresAuthSessionForRequest({ pathname: "/admin", method: "GET" })).toBe(true);
    expect(requiresAuthSessionForRequest({ pathname: "/admin/users", method: "GET" })).toBe(true);
    expect(requiresAuthSessionForRequest({ pathname: "/listings", method: "GET" })).toBe(true);
    expect(requiresAuthSessionForRequest({ pathname: "/listings/abc123", method: "GET" })).toBe(
      true,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/listing-form", method: "GET" })).toBe(true);
    expect(requiresAuthSessionForRequest({ pathname: "/listing-form/abc123", method: "GET" })).toBe(
      true,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/my-listings", method: "GET" })).toBe(true);
    expect(requiresAuthSessionForRequest({ pathname: "/my-listings/drafts", method: "GET" })).toBe(
      true,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/manage-account", method: "GET" })).toBe(
      true,
    );
  });

  it("does not overmatch similar public paths", () => {
    expect(requiresAuthSessionForRequest({ pathname: "/administrator", method: "GET" })).toBe(
      false,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/listings-extra", method: "GET" })).toBe(
      false,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/listing-formal", method: "GET" })).toBe(
      false,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/my-listings-archive", method: "GET" })).toBe(
      false,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/manage-accounting", method: "GET" })).toBe(
      false,
    );
  });

  it("requires auth for protected APIs and all listing API access", () => {
    expect(requiresAuthSessionForRequest({ pathname: "/api/admin/accounts", method: "GET" })).toBe(
      true,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/api/administer", method: "GET" })).toBe(
      false,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/api/listings", method: "GET" })).toBe(true);
    expect(requiresAuthSessionForRequest({ pathname: "/api/listings/abc123", method: "GET" })).toBe(
      true,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/api/listings", method: "POST" })).toBe(true);
    expect(requiresAuthSessionForRequest({ pathname: "/api/listings/abc123", method: "PUT" })).toBe(
      true,
    );
    expect(requiresAuthSessionForRequest({ pathname: "/api/listings-extra", method: "POST" })).toBe(
      false,
    );
  });
});
