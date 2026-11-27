import { expect, test } from "./fixtures.ts";
import { SIGNED_IN_ROLES, storageStatePath } from "./settings.ts";

// The header's mobile menu (#536): it must close on an outside tap, Escape, the X button, or
// picking a link, and keyboard focus must start on the first item and return to the trigger.
// Signed out there is no menu, only a Sign in button.

for (const role of SIGNED_IN_ROLES) {
  test.describe(`mobile menu as ${role}`, () => {
    test.use({ storageState: storageStatePath(role) });

    test.beforeEach(async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "The hamburger menu only shows below lg.");
      await page.goto("/");
    });

    test("closes on an outside tap, Escape and the X button", async ({ page }) => {
      const trigger = page.getByRole("button", { name: "Open navigation menu" });
      const menu = page.getByRole("dialog", { name: "Menu" });
      const nav = menu.getByRole("navigation", { name: "Mobile navigation" });

      await trigger.click();
      await expect(menu).toBeVisible();
      // Focus starts on the first menu item, not the theme toggle.
      await expect(nav.locator("a[href], button").first()).toBeFocused();
      // Not clicked: signing out would end the session the other tests share.
      const signOut = nav.getByRole("button", { name: "Sign out" });
      await expect(signOut).toHaveCount(1);

      // Tap the dimmed page to the left of the panel.
      await page.mouse.click(10, 400);
      await expect(menu).toBeHidden();

      await trigger.click();
      await expect(menu).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();

      await trigger.click();
      const close = menu.getByRole("button", { name: "Close" });
      const box = await close.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(40);
      await close.click();
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
    });

    test("closes after picking a link", async ({ page }) => {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      const menu = page.getByRole("dialog", { name: "Menu" });
      const link = menu.getByRole("link").first();
      const href = await link.getAttribute("href");

      await link.click();
      // `next dev` compiles the destination route on its first visit, which can take a while.
      await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 30_000 });
      await expect(menu).toBeHidden();
    });
  });
}

test("signed out, phones get a Sign in button instead of a menu", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Checks the header below lg.");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("desktop header has no hamburger menu", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Checks the lg and up header.");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeHidden();
});
