/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "./proxy";

// better-auth ships ESM that this Jest setup does not transform; these requests have no session.
jest.mock("better-auth/cookies", () => ({ getSessionCookie: () => null }));

describe("proxy content security policy", () => {
  it.each(["/", "/sign-in", "/listings/abc"])("runs on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it("gives each public page response a fresh script nonce instead of unsafe-inline", () => {
    const scriptSrc = () =>
      proxy(new NextRequest("https://homehub.test/"))
        .headers.get("Content-Security-Policy")
        ?.split("; ")
        .find((directive) => directive.startsWith("script-src "));

    const first = scriptSrc();
    expect(first).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(first).not.toContain("'unsafe-inline'");
    expect(scriptSrc()).not.toBe(first);
  });
});
