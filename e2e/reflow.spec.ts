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

          const overflows = await page.evaluate(() => {
            const describe = (element: Element) =>
              `<${element.tagName.toLowerCase()} class="${element.getAttribute("class") ?? ""}">`;

            // Finds the element to name in the failure. Visiting parents first means a
            // fixed-width container wins over the children that only fill it.
            const findWidest = (scroller: Element, edge: number) => {
              const widest: { element: Element | null; right: number } = {
                element: null,
                right: edge,
              };
              const visit = (element: Element) => {
                const style = getComputedStyle(element);
                // Fixed elements, and anything inside a container that scrolls or clips,
                // can't widen the scroller.
                if (style.position === "fixed") return;
                const { right } = element.getBoundingClientRect();
                if (right > widest.right) {
                  widest.element = element;
                  widest.right = right;
                }
                if (style.overflowX !== "visible") return;
                for (const child of element.children) visit(child);
              };
              for (const child of scroller.children) visit(child);
              return widest.element
                ? `${describe(widest.element)} ends at ${Math.round(widest.right)}px`
                : "not found";
            };

            // Pages such as /listings scroll inside their own panes, so content that is too wide
            // is clipped by the pane, or scrolls it sideways, and leaves the document's width
            // alone. Check the document and every pane that scrolls vertically. Elements that
            // only clip, such as carousels and truncated text, are left out on purpose.
            const root = document.documentElement;
            const scrollers = [root, ...document.body.querySelectorAll("*")].filter((element) => {
              if (element !== root) {
                const { overflowY } = getComputedStyle(element);
                if (overflowY !== "auto" && overflowY !== "scroll") return false;
              }
              // Fractional widths at the device scale factor can round up by a pixel.
              return element.scrollWidth > element.clientWidth + 1;
            });

            return scrollers.map((scroller) => {
              const isRoot = scroller === root;
              const edge = isRoot ? root.clientWidth : scroller.getBoundingClientRect().right;
              return (
                `${isRoot ? "The document" : describe(scroller)} is ${scroller.scrollWidth}px wide ` +
                `in ${scroller.clientWidth}px. Widest element: ${findWidest(isRoot ? document.body : scroller, edge)}`
              );
            });
          });

          expect(
            overflows,
            `${entry.name} (${entry.path}) has content that does not fit at ${REFLOW_WIDTH}px`,
          ).toEqual([]);
        });
      }
    });
  }
});
