import { expect, test } from "./fixtures.ts";
import { openPage } from "./open-page.ts";
import { PAGES } from "./pages.ts";
import { ROLES, storageStatePath } from "./settings.ts";

// WCAG 2.1 AA 1.4.10 Reflow: a page must work at 320px wide without scrolling sideways.
// That is also what a 1280px screen shows at 400% zoom.
const REFLOW_WIDTH = 320;

// Runs in the mobile project only; the desktop project skips this tag (see playwright.config.ts).
test.describe(`reflow at ${REFLOW_WIDTH}px`, { tag: "@mobile-only" }, () => {
  test.use({ viewport: { width: REFLOW_WIDTH, height: 568 } });

  for (const role of ROLES) {
    test.describe(`as ${role}`, () => {
      if (role !== "anonymous") test.use({ storageState: storageStatePath(role) });

      // 1.4.10 applies to the desktopOnly pages too, but they are admin screens that the project
      // does not support on phones, so they are left out here.
      for (const entry of PAGES.filter((page) => page.role === role && !page.desktopOnly)) {
        test(`${entry.name} (${entry.path})`, async ({ page }) => {
          await openPage(page, entry);

          const overflow = await page.evaluate(() => {
            const root = document.documentElement;
            if (root.scrollWidth <= root.clientWidth) return null;

            // Finds the element to name in the failure. Visiting parents first means a
            // fixed-width container wins over the children that only fill it.
            const widest: { element: Element | null; right: number } = {
              element: null,
              right: root.clientWidth,
            };
            const visit = (element: Element) => {
              const style = getComputedStyle(element);
              // Fixed elements, and anything inside a container that scrolls or clips,
              // can't widen the document.
              if (style.position === "fixed") return;
              const { right } = element.getBoundingClientRect();
              if (right > widest.right) {
                widest.element = element;
                widest.right = right;
              }
              if (style.overflowX !== "visible") return;
              for (const child of element.children) visit(child);
            };
            visit(document.body);

            const { element, right } = widest;
            return {
              scrollWidth: root.scrollWidth,
              widest: element
                ? `<${element.tagName.toLowerCase()} class="${element.getAttribute("class") ?? ""}"> ends at ${Math.round(right)}px`
                : "not found",
            };
          });

          expect(
            overflow,
            `${entry.name} (${entry.path}) scrolls sideways at ${REFLOW_WIDTH}px. ` +
              `The document is ${overflow?.scrollWidth}px wide. Widest element: ${overflow?.widest}`,
          ).toBeNull();
        });
      }
    });
  }
});
