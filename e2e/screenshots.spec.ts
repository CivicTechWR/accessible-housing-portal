import { test } from "./fixtures.ts";
import { openPage } from "./open-page.ts";
import { PAGES } from "./pages.ts";
import { ROLES, storageStatePath } from "./settings.ts";

// Hides the Next.js dev-mode indicator so it doesn't appear in screenshots.
const SCREENSHOT_STYLE = "nextjs-portal { display: none !important; }";

for (const role of ROLES) {
  test.describe(`as ${role}`, () => {
    if (role !== "anonymous") test.use({ storageState: storageStatePath(role) });

    for (const entry of PAGES.filter((page) => page.role === role)) {
      // Each project skips the other's size-only tests (see playwright.config.ts).
      const details = entry.desktopOnly
        ? { tag: "@desktop-only" }
        : entry.mobileOnly
          ? { tag: "@mobile-only" }
          : {};
      test(`${entry.name} (${entry.path})`, details, async ({ page }, testInfo) => {
        await openPage(page, entry);

        await page.screenshot({
          path: `e2e/screenshots/${testInfo.project.name}/${entry.name}.png`,
          fullPage: true,
          animations: "disabled",
          style: SCREENSHOT_STYLE,
        });
      });
    }
  });
}
