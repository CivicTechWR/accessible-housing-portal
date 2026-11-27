import { expect, test } from "./fixtures.ts";

// Pages set only their own title. The title template in app/layout.tsx adds the product name.
test("a page title ends with the product name", async ({ page }) => {
  await page.goto("/community-agreement");
  await expect(page).toHaveTitle("Community agreement and terms of use | Home Hub");
});
