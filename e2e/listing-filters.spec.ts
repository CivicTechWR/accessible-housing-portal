import type { Page } from "@playwright/test";
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

// Typing before hydration is lost when React takes over the input, so wait until React owns it.
async function waitForSearchBox(page: Page) {
  await page.waitForFunction(() => {
    const input = document.querySelector('form[role="search"] input[name="location"]');
    return !!input && Object.keys(input).some((key) => key.startsWith("__reactFiber"));
  });
}

// Issue #594: typing updated `?location=` on every keystroke, and late URL updates overwrote the
// box mid-word ("Waterloo" became "aterloo"). The search now runs only when it's submitted.
test("the search box keeps every character and searches on Enter", async ({ page }) => {
  await page.goto("/listings");
  await waitForSearchBox(page);
  const searchBox = page.getByRole("searchbox", { name: /Search city, address, or building/ });

  await searchBox.pressSequentially("Waterloo", { delay: 55 });

  await expect(searchBox).toHaveValue("Waterloo");
  await expect(page).not.toHaveURL(/location=/);

  await searchBox.press("Enter");

  await expect(page).toHaveURL(/location=Waterloo/);
  await expect(searchBox).toHaveValue("Waterloo");
});

test("the Search button searches, and Back returns to the previous search", async ({ page }) => {
  await page.goto("/listings?location=Kitchener");
  await waitForSearchBox(page);
  const search = page.getByRole("search");
  const searchBox = search.getByRole("searchbox");

  await searchBox.fill("Guelph");
  await search.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/location=Guelph/);

  await page.goBack();

  await expect(page).toHaveURL(/location=Kitchener/);
  await expect(searchBox).toHaveValue("Kitchener");
});
