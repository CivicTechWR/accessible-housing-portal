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

test("below lg, focus moves between the preview card and the Back button", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The Back button only shows below lg.");
  await openListingForm(page);
  await page.getByRole("tab", { name: "Preview", exact: true }).click();

  const card = page.getByRole("button", { name: /^View listing:/ });
  const back = page.getByRole("button", { name: "Back to card preview" });

  await card.click();
  await expect(back).toBeFocused();

  await back.click();
  await expect(card).toBeFocused();
});

test("at lg and up, focus moves to the divider and stays there", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The divider only shows at lg and up.");
  await openListingForm(page);

  await page.getByRole("button", { name: /^View listing:/ }).click();
  const hideDetails = page.getByRole("button", { name: "Show card preview" });
  await expect(hideDetails).toBeFocused();

  await hideDetails.click();
  await expect(page.getByRole("button", { name: "Show full page" })).toBeFocused();
});
