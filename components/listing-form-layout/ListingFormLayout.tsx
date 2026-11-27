"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FormSectionProps {
  /** The section's anchor, used by the section nav. */
  id?: string;
  title: string;
  description?: string;
  /** Extra content beside the heading, such as a count. */
  headerAside?: ReactNode;
  children: ReactNode;
}

/**
 * One card in the listing form, with an 18px heading and a one-line description. On phones it
 * drops the card for a full-width block with a 20px heading and a divider underneath.
 */
export function FormSection({ id, title, description, headerAside, children }: FormSectionProps) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      // Leaves room for the sticky bars when the section strip scrolls a section into view. Adds
      // to the page's scroll padding in globals.css; phones add 2rem for the taller section menu.
      className={cn(
        "text-card-foreground max-sm:scroll-mt-8",
        "border-b border-border pt-7 pb-8 last-of-type:border-b-0 sm:rounded-xl sm:border sm:bg-card sm:p-6 sm:last-of-type:border-b",
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2 sm:space-y-1">
          {/* tabIndex lets the section nav move focus here after scrolling. */}
          <h2 id={headingId} tabIndex={-1} className="text-xl outline-none sm:text-lg">
            {title}
          </h2>
          {description && (
            <p className="text-base text-muted-foreground sm:text-sm">{description}</p>
          )}
        </div>
        {/* A count beside the heading keeps to one line and leaves the rest to the description. */}
        {headerAside ? <div className="shrink-0 whitespace-nowrap">{headerAside}</div> : null}
      </div>
      {/* Two columns at every width, so short fields can pair up on phones. Children set their
          own span: col-span-2 for a full row, "col-span-2 md:col-span-1" for half a row from md. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">{children}</div>
    </section>
  );
}

export interface ListingFormLayoutProps {
  /** The page title block shown above the form. */
  header?: ReactNode;
  /** The section strip, pinned above the form. */
  sectionNav?: ReactNode;
  previewPaneHeader?: ReactNode;
  formContent: ReactNode;
  previewContent?: ReactNode;
  /** The left of the sticky bar at the bottom of the screen, such as the save state. On phones
   * it shares the row with the buttons when it fits, so keep it to one short line. */
  footer?: ReactNode;
  /** The sticky bar's main action, at its right edge. Below lg the Preview button sits before it. */
  footerAction?: ReactNode;
  isPreviewExpanded?: boolean;
}

type Pane = "form" | "preview";

const PAGE_COLUMN = "mx-auto w-full max-w-5xl";

/**
 * Below lg only one pane shows at a time. Both stay mounted, so form state and the live
 * preview survive switching, and each pane returns to where it was last scrolled.
 */
function usePaneSwitcher() {
  const [activePane, setActivePane] = useState<Pane>("form");
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Partial<Record<Pane, number>>>({});
  const pendingScroll = useRef<number | null>(null);

  const switchPane = (pane: Pane) => {
    if (pane === activePane) return;
    scrollPositions.current[activePane] = window.scrollY;
    // A pane opened for the first time starts at the top of the panes.
    const containerTop = (containerRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
    pendingScroll.current = scrollPositions.current[pane] ?? Math.min(window.scrollY, containerTop);
    setActivePane(pane);
  };

  useLayoutEffect(() => {
    if (pendingScroll.current === null) return;
    window.scrollTo({ top: pendingScroll.current });
    pendingScroll.current = null;
  }, [activePane]);

  return { activePane, switchPane, containerRef };
}

/**
 * The bar pinned to the bottom of the screen. The bar spans the page, and its contents span the
 * editor's column: save state at the left edge, actions at the right edge of the preview. On
 * phones the buttons share the rest of the row equally, and the save state wraps onto its own
 * line above them only when both won't fit at their natural widths.
 */
function StickyFooter({ status, actions }: { status: ReactNode; actions: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6">
      <div
        className={cn(
          PAGE_COLUMN,
          "flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-2 sm:gap-x-3",
        )}
      >
        {status}
        <div className="flex grow gap-2 *:flex-1 sm:shrink-0 sm:grow-0 sm:gap-3 sm:*:flex-none">
          {actions}
        </div>
      </div>
    </div>
  );
}

export function ListingFormLayout({
  header,
  sectionNav,
  previewPaneHeader,
  formContent,
  previewContent,
  footer,
  footerAction,
  isPreviewExpanded = false,
}: ListingFormLayoutProps) {
  const hasPreview = Boolean(previewContent);
  const { activePane, switchPane, containerRef } = usePaneSwitcher();
  const isPreviewing = hasPreview && activePane === "preview";

  // The same 1024px column as every other page, so the header, footer and page edges line up.
  // The form gets about 670px and the preview 320px, or the other way round when the preview
  // shows the full listing page.
  const gridClassName = cn(
    PAGE_COLUMN,
    "grid grid-cols-1 gap-8 lg:items-start",
    hasPreview &&
      (isPreviewExpanded
        ? "lg:grid-cols-[20rem_minmax(0,1fr)]"
        : "lg:grid-cols-[minmax(0,1fr)_20rem]"),
  );

  return (
    <div
      ref={containerRef}
      // globals.css keys the page's scroll padding off this attribute.
      data-listing-form-tabs=""
      // Chrome scrolls a focused textarea only far enough to show the caret, which can leave
      // most of it under the sticky bars. "nearest" respects the scroll padding and is a no-op
      // when the field is already fully visible.
      onFocus={(event) => {
        if (event.target instanceof HTMLTextAreaElement) {
          event.target.scrollIntoView({ block: "nearest" });
        }
      }}
      className="w-full"
    >
      {header ? <div className={cn(PAGE_COLUMN, "mb-4 lg:mb-6")}>{header}</div> : null}
      {/* The section strip, pinned to the top while the form shows. Full bleed, like the site
          header, with its contents in the page column. */}
      {sectionNav ? (
        <div
          className={cn(
            "sticky top-0 z-20 -mx-4 border-b border-border bg-background px-4 sm:-mx-6 sm:px-6",
            isPreviewing && "max-lg:hidden",
          )}
        >
          <div className={PAGE_COLUMN}>{sectionNav}</div>
        </div>
      ) : null}
      <div className={cn(gridClassName, sectionNav && "sm:pt-6")}>
        {/* Below lg the inactive pane is hidden with CSS only, so both stay mounted. */}
        <section aria-label="Form" className={cn("min-w-0", isPreviewing && "max-lg:hidden")}>
          <div className="space-y-6">{formContent}</div>
        </section>

        {previewContent && (
          // Sits below the sticky section strip at lg.
          <section
            aria-label="Preview"
            className={cn(
              "min-w-0 lg:sticky lg:top-20 lg:self-start",
              !isPreviewing && "max-lg:hidden",
            )}
          >
            {/* On phones the pane is the whole screen, so it drops the card frame. At lg the card
                ends 16px above the sticky save bar (65px tall): 5rem top + 65px + 1rem. */}
            <div className="sm:overflow-hidden sm:rounded-xl sm:border sm:border-border sm:bg-card lg:flex lg:max-h-[calc(100vh-10rem-1px)] lg:flex-col">
              {previewPaneHeader && (
                <div className="shrink-0 border-b border-border pt-4 pb-3 sm:px-4 sm:pt-3">
                  {previewPaneHeader}
                </div>
              )}
              {/* Scrolls on its own at lg, so the preview stays beside the field being edited. */}
              <div className="pt-4 sm:p-4 lg:min-h-0 lg:overflow-y-auto">{previewContent}</div>
            </div>
          </section>
        )}
      </div>
      {footer || footerAction ? (
        <StickyFooter
          status={footer}
          actions={
            <>
              {hasPreview ? (
                // Below lg only one pane fits, so this button swaps them. Its label names the pane it
                // opens; a pressed state would contradict the changing label, so it has none.
                <Button
                  type="button"
                  variant="outline"
                  // A tap leaves the hover fill on touch screens, which made the button look
                  // disabled after switching panes. It only shows below lg, so it keeps the card
                  // fill and darkens only while pressed.
                  className="hover:bg-card active:bg-muted max-sm:h-11 lg:hidden"
                  onClick={() => switchPane(isPreviewing ? "form" : "preview")}
                >
                  {isPreviewing ? "Edit" : "Preview"}
                </Button>
              ) : null}
              {footerAction}
            </>
          }
        />
      ) : null}
    </div>
  );
}
