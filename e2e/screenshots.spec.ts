import { expect, test } from "./fixtures.ts";
import { PAGES } from "./pages.ts";
import { storageStatePath, type Role } from "./settings.ts";

const ROLES: Role[] = ["anonymous", "searcher", "partner", "admin"];

// Hides the Next.js dev-mode indicator so it doesn't appear in screenshots.
const SCREENSHOT_STYLE = "nextjs-portal { display: none !important; }";

for (const role of ROLES) {
  test.describe(`as ${role}`, () => {
    if (role !== "anonymous") test.use({ storageState: storageStatePath(role) });

    for (const entry of PAGES.filter((page) => page.role === role)) {
      // The mobile project skips @desktop-only tests (see playwright.config.ts).
      const details = entry.desktopOnly ? { tag: "@desktop-only" } : {};
      test(`${entry.name} (${entry.path})`, details, async ({ page }, testInfo) => {
        const response = await page.goto(entry.path);
        expect(response?.status(), "page should load without an error status").toBeLessThan(400);
        // A protected page redirects to /sign-in when the session is missing; fail instead of capturing that.
        expect(new URL(page.url()).pathname).toBe(new URL(entry.path, page.url()).pathname);

        // Full-page screenshots don't scroll, so load lazy images up front.
        await page.evaluate(() => {
          for (const image of document.querySelectorAll<HTMLImageElement>("img[loading=lazy]")) {
            image.loading = "eager";
          }
        });
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);

        const screenshot = await page.screenshot({
          path: `e2e/screenshots/${testInfo.project.name}/${entry.name}.png`,
          fullPage: true,
          animations: "disabled",
          style: SCREENSHOT_STYLE,
        });
        await testInfo.attach(entry.name, { body: screenshot, contentType: "image/png" });
      });
    }
  });
}
