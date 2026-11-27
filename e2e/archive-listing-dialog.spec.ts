import { expect, test } from "./fixtures.ts";
import { storageStatePath } from "./settings.ts";

// The Archive confirmation on My Listings (#568). Only the cancel paths run here: every spec
// shares one database, so archiving a seeded listing would change what the others see.

test.use({ storageState: storageStatePath("partner") });

test("the archive confirmation closes on Cancel and Escape without archiving", async ({ page }) => {
  const archiveRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/archive")) archiveRequests.push(request.url());
  });

  await page.goto("/my-listings");
  // Archive sits in each row's overflow menu, which gets focus back when the dialog closes.
  const menuButton = page.getByRole("button", { name: /^More actions for / }).first();
  const archive = page.getByRole("menuitem", { name: "Archive" });
  const restoreButtons = page.getByRole("button", { name: "Restore" });
  const restoreCount = await restoreButtons.count();
  const dialog = page.getByRole("alertdialog", { name: "Archive this listing?" });
  const cancel = dialog.getByRole("button", { name: "Cancel" });

  await menuButton.click();
  await archive.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "It will be kept in an archived state and can be restored later.",
  );
  // Focus starts on Cancel, so pressing Enter straight away archives nothing.
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(dialog).toBeHidden();
  await expect(menuButton).toBeFocused();

  await page.keyboard.press("Enter");
  await archive.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menuButton).toBeFocused();

  expect(archiveRequests).toEqual([]);
  await expect(restoreButtons).toHaveCount(restoreCount);
});
