import { expect, test as setup } from "./fixtures.ts";
import {
  E2E_ACCOUNTS,
  E2E_BASE_URL,
  E2E_REVIEW_PASSWORD,
  SIGNED_IN_ROLES,
  storageStatePath,
} from "./settings.ts";

// Sign in once per role through the auth API and reuse the session in every spec.
// The sign-in form itself is captured by the screenshot spec.

// One at a time: concurrent sign-ins from one IP race on Better Auth's shared rate-limit row.
setup.describe.configure({ mode: "default" });

for (const role of SIGNED_IN_ROLES) {
  setup(`sign in as ${role}`, async ({ page }) => {
    const response = await page.request.post("/api/auth/sign-in/email", {
      // better-auth rejects cookie-setting requests without a trusted Origin.
      headers: { Origin: E2E_BASE_URL },
      data: { email: E2E_ACCOUNTS[role], password: E2E_REVIEW_PASSWORD },
    });
    expect(response.ok(), await response.text()).toBe(true);

    await page.goto("/manage-account");
    await expect(page).toHaveURL((url) => url.pathname === "/manage-account");
    await page.context().storageState({ path: storageStatePath(role) });
  });
}
