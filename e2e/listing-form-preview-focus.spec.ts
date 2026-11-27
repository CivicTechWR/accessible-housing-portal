import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";
import { E2E_SEEDED_LISTING_ID, storageStatePath } from "./settings.ts";

// The listing form's Live Preview (#570): switching between the card and the listing details
// unmounts the control that was pressed, so focus must land on the control that switches back.
// These tests only read the form. Other specs share the seeded listing.

test.use({ storageState: storageStatePath("partner") });

async function openListingForm(page: Page) {
  await page.goto(`/listing-form/${E2E_SEEDED_LISTING_ID}`);
  // `next dev` compiles the route on its first visit, which can take a while.
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 30_000 });
}

test("below lg, focus moves from the preview card to the preview toggle", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The Preview button only shows below lg.");
  await openListingForm(page);
  await page.getByRole("button", { name: "Preview", exact: true }).click();

  const card = page.getByRole("button", { name: /^View listing:/ });
  const toggle = page.getByRole("button", { name: "Show card preview" });

  await card.click();
  await expect(toggle).toBeFocused();

  await toggle.click();
  await expect(page.getByRole("button", { name: "Show full page" })).toBeFocused();
});

test("at lg and up, focus moves to the preview toggle and stays there", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Both panes only show side by side at lg and up.");
  await openListingForm(page);

  await page.getByRole("button", { name: /^View listing:/ }).click();
  const hideDetails = page.getByRole("button", { name: "Show card preview" });
  await expect(hideDetails).toBeFocused();

  await hideDetails.click();
  await expect(page.getByRole("button", { name: "Show full page" })).toBeFocused();
});
