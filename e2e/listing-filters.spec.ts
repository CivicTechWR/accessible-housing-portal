import { expect, test } from "./fixtures.ts";
import { storageStatePath } from "./settings.ts";

// Every view on the listings page must keep every filter reachable. The "Filters" button opens a
// bottom sheet on phones and a side panel on wider screens. Wider screens switch views with a
// List / Map / Split radio group; phones open in List view and switch with a floating button.
// PR #526 hid the search-bar price on phones while the sheet only rendered beside the list,
// so Map view on a phone had no filters at all. This loops over views so that can't recur.

test.use({ storageState: storageStatePath("searcher") });

const FILTER_LABELS = ["Min price", "Max price", "Bedrooms", "Bathrooms"];

for (const view of ["List", "Map", "Split"] as const) {
  test(`filters are reachable in ${view} view`, async ({ page, isMobile }) => {
    test.skip(isMobile && view === "Split", "Phones have no Split view.");

    await page.goto("/listings");
    // A click before hydration does nothing, so retry until the view actually switches.
    if (!isMobile) {
      const viewOption = page.getByRole("radio", { name: view, exact: true });
      await expect(async () => {
        await viewOption.click();
        await expect(viewOption).toBeChecked({ timeout: 1_000 });
      }).toPass();
    } else if (view === "Map") {
      await expect(async () => {
        await page.getByRole("button", { name: "Show map" }).click();
        await expect(page.getByRole("button", { name: "Show list" })).toBeVisible({
          timeout: 1_000,
        });
      }).toPass();
    }

    const openButton = page.getByRole("button", { name: "Filters", exact: true });
    await expect(openButton).toBeVisible();
    await openButton.click();

    const filters = isMobile
      ? page.getByRole("dialog", { name: "Filters" })
      : page.getByRole("complementary", { name: "Filters" });
    await expect(filters).toBeVisible();
    for (const label of FILTER_LABELS) {
      await filters.getByText(label, { exact: true }).scrollIntoViewIfNeeded();
      await expect(filters.getByText(label, { exact: true })).toBeVisible();
    }

    if (isMobile) {
      // The sheet closes with Escape and hands focus back to the button that opened it.
      await page.keyboard.press("Escape");
      await expect(filters).toBeHidden();
      await expect(openButton).toBeFocused();
    }
  });
}
