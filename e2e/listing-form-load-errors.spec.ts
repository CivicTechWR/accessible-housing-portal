import { randomUUID } from "node:crypto";

import { expect, test } from "./fixtures.ts";
import { E2E_SEEDED_LISTING_ID, storageStatePath } from "./settings.ts";

// What the listing form shows when a listing fails to load (#569). Nothing here edits or saves
// the seeded listing: the other specs and the screenshots read it from the same database.

test.use({ storageState: storageStatePath("partner") });

// `next dev` compiles the API route on its first request, which can take a while.
const FIRST_REQUEST_TIMEOUT = 30_000;

test("says a missing listing was not found and links to My Listings", async ({ page }) => {
  const listingId = randomUUID();
  let notFoundResponses = 0;
  page.on("response", (response) => {
    if (response.status() === 404 && response.url().endsWith(`/api/listings/${listingId}/editor`)) {
      notFoundResponses += 1;
    }
  });

  await page.goto(`/listing-form/${listingId}`);

  await expect(page.getByRole("heading", { name: "Listing not found" })).toBeVisible({
    timeout: FIRST_REQUEST_TIMEOUT,
  });
  await expect(
    page.getByText("This listing doesn't exist or belongs to another account."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to My Listings" })).toHaveAttribute(
    "href",
    "/my-listings",
  );
  // A retry would have made a second request before the message showed.
  expect(notFoundResponses).toBe(1);
});

test("offers a retry when the listing can't be loaded", async ({ page }) => {
  const editorUrl = `**/api/listings/${E2E_SEEDED_LISTING_ID}/editor`;
  await page.route(editorUrl, (route) => route.fulfill({ status: 500, json: { message: "Down" } }));

  await page.goto(`/listing-form/${E2E_SEEDED_LISTING_ID}`);

  const heading = page.getByRole("heading", { name: "This listing couldn't be loaded" });
  await expect(heading).toBeVisible();
  await expect(page.getByText("Check your connection and try again.")).toBeVisible();

  // Hold the retry's request, so the pending button can be seen before the form replaces it.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.unroute(editorUrl);
  await page.route(editorUrl, async (route) => {
    await held;
    await route.continue();
  });

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Trying again..." })).toBeDisabled();
  await expect(heading).toBeVisible();

  release();
  await expect(page.locator("#listing-form")).toBeVisible({ timeout: FIRST_REQUEST_TIMEOUT });
});
