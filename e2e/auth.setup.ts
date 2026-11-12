import { expect, test as setup } from "@playwright/test";

import {
  E2E_ACCOUNTS,
  E2E_REVIEW_PASSWORD,
  storageStatePath,
  type SignedInRole,
} from "./settings.ts";

// Sign in once per role through the real form and reuse the session in every spec.
for (const role of Object.keys(E2E_ACCOUNTS) as SignedInRole[]) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await page.goto("/sign-in?callbackUrl=/manage-account");
    // Let the form hydrate first; a pre-hydration click would do a native form submit instead.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(E2E_ACCOUNTS[role]);
    await page.getByLabel("Password").fill(E2E_REVIEW_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/manage-account");
    await page.context().storageState({ path: storageStatePath(role) });
  });
}
