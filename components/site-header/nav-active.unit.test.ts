import { describe, expect, it } from "@jest/globals";
import { isActivePath } from "@/components/site-header/nav-active";

describe("isActivePath", () => {
  it("matches the exact route", () => {
    expect(isActivePath("/my-listings", "/my-listings")).toBe(true);
  });

  it("matches nested routes under a nav destination", () => {
    expect(isActivePath("/admin/users/invite", "/admin/users")).toBe(true);
  });

  it("does not match sibling routes that share a prefix", () => {
    expect(isActivePath("/my-listings-archive", "/my-listings")).toBe(false);
  });

  it("does not match unrelated routes", () => {
    expect(isActivePath("/listings", "/my-listings")).toBe(false);
  });

  it("only treats the home route as active on an exact match", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/listings", "/")).toBe(false);
  });
});
