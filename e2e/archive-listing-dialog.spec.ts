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
  const archive = page.getByRole("button", { name: "Archive" }).first();
  const restoreButtons = page.getByRole("button", { name: "Restore" });
  const restoreCount = await restoreButtons.count();
  const dialog = page.getByRole("alertdialog", { name: "Archive this listing?" });
  const cancel = dialog.getByRole("button", { name: "Cancel" });

  await archive.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "It will be kept in an archived state and can be restored later.",
  );
  // Focus starts on Cancel, so pressing Enter straight away archives nothing.
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(dialog).toBeHidden();
  await expect(archive).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(archive).toBeFocused();

  expect(archiveRequests).toEqual([]);
  await expect(restoreButtons).toHaveCount(restoreCount);
});
