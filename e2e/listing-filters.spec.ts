import { expect, test } from "./fixtures.ts";
import { storageStatePath } from "./settings.ts";

// Every view on the listings page must keep every filter reachable. Phones open a bottom sheet
// from the "Filters" icon button; wider screens open a side panel from "All Filters".
// PR #526 hid the search-bar price on phones while the sheet only rendered beside the list,
// so Map view on a phone had no filters at all. This loops over views so that can't recur.

test.use({ storageState: storageStatePath("searcher") });

const FILTER_LABELS = ["Min Price", "Max Price", "Bedrooms", "Bathrooms"];

for (const view of ["List", "Map", "Split"] as const) {
  test(`filters are reachable in ${view} view`, async ({ page, isMobile }) => {
    test.skip(isMobile && view === "Split", "Phones have no Split view.");

    await page.goto("/listings");
    const viewOption = page.getByRole("radio", { name: view, exact: true });
    // A click before hydration does nothing, so retry until the view actually switches.
    await expect(async () => {
      await viewOption.click();
      await expect(viewOption).toBeChecked({ timeout: 1_000 });
    }).toPass();

    const openButton = isMobile
      ? page.getByRole("button", { name: "Filters", exact: true })
      : page.getByRole("button", { name: /All Filters/ });
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
