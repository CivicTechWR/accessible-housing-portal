import { expect, type Page } from "@playwright/test";

import type { PageEntry } from "./pages.ts";

/** Opens a page from e2e/pages.ts and waits until its content, images and fonts have loaded. */
export async function openPage(page: Page, entry: PageEntry) {
  const response = await page.goto(entry.path);
  expect(response?.status(), "page should load without an error status").toBeLessThan(400);
  // A protected page redirects to /sign-in when the session is missing; fail instead of checking that.
  expect(new URL(page.url()).pathname).toBe(new URL(entry.path, page.url()).pathname);
  if (entry.expectText) await expect(page.getByText(entry.expectText)).toBeVisible();

  // Neither a full-page screenshot nor the reflow check scrolls, so load lazy images up front.
  await page.evaluate(() => {
    for (const image of document.querySelectorAll<HTMLImageElement>("img[loading=lazy]")) {
      image.loading = "eager";
    }
  });
  await page.waitForLoadState("networkidle");
  // Client queries can start after networkidle while the page hydrates.
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  if (entry.pressButton) {
    const button = page.getByRole("button", { name: entry.pressButton, exact: true });
    await button.click();
    await expect(button).not.toBeVisible();
  }
}
