import { describe, expect, it } from "@jest/globals";

import {
  getAccountInviteEmailIdempotencyKey,
  renderAccountInviteEmail,
} from "@/lib/auth/invite-email";

describe("getAccountInviteEmailIdempotencyKey", () => {
  it("uses the persisted invite id as the stable logical email key", () => {
    expect(getAccountInviteEmailIdempotencyKey("2e42f745-44e8-4ab7-a2a2-c1f42cc8e204")).toBe(
      "account_invite/2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
    );
  });
});

describe("renderAccountInviteEmail", () => {
  it("renders the invite link into subject, text, and html", () => {
    const content = renderAccountInviteEmail({
      fullName: "Tenant User",
      inviteUrl: "https://housing.example.org/invite?token=abc123",
    });

    expect(content.subject).toBe("You’ve been invited to the Affordable Housing Portal");
    expect(content.text).toContain("Hello Tenant User,");
    expect(content.text).toContain("https://housing.example.org/invite?token=abc123");
    expect(content.html).toContain('href="https://housing.example.org/invite?token=abc123"');
  });

  it("escapes HTML in the recipient name", () => {
    const content = renderAccountInviteEmail({
      fullName: '<img src="x">',
      inviteUrl: "https://housing.example.org/invite?token=abc123",
    });

    expect(content.html).not.toContain('<img src="x">');
    expect(content.html).toContain("&lt;img src=&quot;x&quot;&gt;");
  });

  it("rejects invite URLs that are not http(s)", () => {
    expect(() =>
      renderAccountInviteEmail({
        fullName: "Tenant User",
        // oxlint-disable-next-line no-script-url
        inviteUrl: "javascript:alert(1)",
      }),
    ).toThrow("Invite URL must use http or https.");
  });
});
