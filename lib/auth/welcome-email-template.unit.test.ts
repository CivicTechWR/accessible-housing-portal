import { describe, expect, it } from "@jest/globals";

import { buildWelcomeEmail } from "@/lib/auth/welcome-email-template";

const params = { fullName: "Avery", platformUrl: "https://housing.example.org" };

describe("welcome email templates", () => {
  it("explains the separate invitation and limits navigator access to browsing and contact", () => {
    const navigator = buildWelcomeEmail({ ...params, audience: "navigator" });
    const provider = buildWelcomeEmail({ ...params, audience: "provider" });

    expect(navigator.text).toContain("separate system email inviting you to create an account");
    expect(navigator.text).toContain("explore listings and connect with housing providers");
    expect(navigator.text).not.toContain("create listings");
    expect(provider.text).toContain("explore the platform and create listings");
    expect(provider.subject).not.toEqual(navigator.subject);
  });

  it("escapes the recipient name and uses public links without invitation tokens", () => {
    const email = buildWelcomeEmail({
      fullName: '<img src=x onerror="alert(1)">',
      audience: "navigator",
      platformUrl: "https://housing.example.org/invite?token=secret-token",
    });

    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img");
    expect(email.html).toContain('href="https://housing.example.org/sign-in"');
    expect(email.html).toContain('href="https://housing.example.org/community-agreement"');
    expect(email.html + email.text).not.toContain("secret-token");
  });

  it("rejects executable link protocols", () => {
    expect(() =>
      buildWelcomeEmail({ ...params, audience: "provider", platformUrl: "javascript:alert(1)" }),
    ).toThrow("Platform URL must use http or https.");
  });
});
