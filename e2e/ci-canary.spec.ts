// TEMPORARY: proves a failing behaviour spec fails the Playwright E2E job (#545). Removed before merge.
import { expect, test } from "./fixtures.ts";

test("canary behaviour test fails on purpose", async ({ page }) => {
  await page.goto("/listings");
  await expect(page.getByText("this text is not on the page")).toBeVisible({ timeout: 5_000 });
});
