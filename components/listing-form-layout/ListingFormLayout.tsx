"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
 * drops the card for a full-width block with a divider underneath.
 */
export function FormSection({ id, title, description, headerAside, children }: FormSectionProps) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      // Leaves room for the sticky bars when the section strip scrolls a section into view. Adds
      // to the page's scroll padding in globals.css (5rem below lg, 1rem from lg).
      className={cn(
        "text-card-foreground",
        "border-b border-border py-6 sm:rounded-xl sm:border-0 sm:bg-card sm:p-6 sm:shadow-xs sm:ring-1 sm:ring-foreground/10",
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          {/* tabIndex lets the section nav move focus here after scrolling. */}
          <h2 id={headingId} tabIndex={-1} className="text-lg font-semibold outline-none">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {headerAside}
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
  /** The sticky bar at the bottom of the screen with save state and the primary action. */
  footer?: ReactNode;
  isPreviewExpanded?: boolean;
}

type Pane = "form" | "preview";

const PAGE_COLUMN = "mx-auto w-full max-w-5xl";

const PANES: { value: Pane; label: string }[] = [
  { value: "form", label: "Form" },
  { value: "preview", label: "Preview" },
];

/** The Form/Preview switch shown below lg, where only one pane fits. */
function PaneTabs() {
  return (
    <div className="py-2 lg:hidden">
      <TabsList
        aria-label="Listing editor view"
        className="grid h-11 w-full grid-cols-2 gap-1 rounded-lg p-1 group-data-horizontal/tabs:h-11"
      >
        {PANES.map(({ value, label }) => (
          <TabsTrigger key={value} value={value} className="h-9 rounded-md px-4 text-sm">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

/**
 * Below lg the inactive pane is hidden with CSS only. At lg and up both panes show side by side.
 * Panes are force-mounted, so form state and the live preview survive switching tabs.
 */
function PaneSection({
  value,
  hasTabs,
  className,
  children,
}: {
  value: Pane;
  hasTabs: boolean;
  className: string;
  children: ReactNode;
}) {
  if (!hasTabs) {
    return (
      <section aria-label={value === "form" ? "Form" : "Preview"} className={className}>
        {children}
      </section>
    );
  }

  return (
    // Classes go on TabsContent, not the section: asChild joins class lists without merging them,
    // so TabsContent's own text-xs would otherwise win over the override.
    <TabsContent
      value={value}
      forceMount
      asChild
      // Radix makes panels a tab stop by default. Both panes start with focusable controls, so
      // the panel itself doesn't need to be one (the ARIA tabs pattern allows this). It also
      // avoids two invisible tab stops at lg+, where the tab list is hidden.
      tabIndex={-1}
      className={cn(
        className,
        // Keep the page's base text size instead of TabsContent's text-xs.
        "text-base/normal data-[state=inactive]:hidden lg:data-[state=inactive]:block",
      )}
    >
      <section>{children}</section>
    </TabsContent>
  );
}

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
    // A pane opened for the first time starts at its top, just under the switcher.
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
 * The bar pinned to the bottom of the screen. The bar spans the page, but its contents sit on the
 * same grid as the panes, so the save state and button line up with the form column.
 */
function StickyFooter({ gridClassName, children }: { gridClassName: string; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6">
      <div className={gridClassName}>
        <div className="flex min-w-0 items-center justify-end gap-3">{children}</div>
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
  isPreviewExpanded = false,
}: ListingFormLayoutProps) {
  const hasPreview = Boolean(previewContent);
  const { activePane, switchPane, containerRef } = usePaneSwitcher();

  // The same 1024px column as every other page, so the header, footer and page edges line up.
  // The form gets about 670px and the preview 320px, or the other way round when the preview
  // shows the full listing page.
  const gridClassName = cn(
    PAGE_COLUMN,
    "grid grid-cols-1 gap-8",
    hasPreview &&
      (isPreviewExpanded
        ? "lg:grid-cols-[20rem_minmax(0,1fr)]"
        : "lg:grid-cols-[minmax(0,1fr)_20rem]"),
  );
  const footerBar = footer ? (
    <StickyFooter gridClassName={gridClassName}>{footer}</StickyFooter>
  ) : null;

  const panes = (
    <div className={cn(gridClassName, "lg:items-start")}>
      <PaneSection value="form" hasTabs={hasPreview} className="min-w-0">
        <div className="space-y-6">{formContent}</div>
      </PaneSection>

      {previewContent && (
        // Sits below the sticky section strip at lg.
        <PaneSection value="preview" hasTabs className="min-w-0 lg:sticky lg:top-20">
          {/* On phones the pane is the whole screen, so it drops the card frame. */}
          <div className="sm:overflow-hidden sm:rounded-xl sm:bg-card sm:shadow-xs sm:ring-1 sm:ring-foreground/10">
            {previewPaneHeader && (
              <div className="border-b border-foreground/10 pb-3 sm:px-4 sm:pt-3">
                {previewPaneHeader}
              </div>
            )}
            {/* Scrolls on its own at lg, so the preview stays beside the field being edited. */}
            <div className="pt-4 sm:p-4 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto">
              {previewContent}
            </div>
          </div>
        </PaneSection>
      )}
    </div>
  );

  if (!hasPreview) {
    return (
      <div className="w-full">
        {header ? <div className={cn(PAGE_COLUMN, "mb-6")}>{header}</div> : null}
        {panes}
        {footerBar}
      </div>
    );
  }

  return (
    <Tabs
      ref={containerRef}
      value={activePane}
      onValueChange={(value) => {
        if (value) switchPane(value as Pane);
      }}
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
      className="block w-full"
    >
      {header ? <div className={cn(PAGE_COLUMN, "mb-4 lg:mb-6")}>{header}</div> : null}
      {/* Pinned to the top: the Form/Preview switch below lg, then the section strip while the
          form shows. Full bleed, like the site header, with its contents in the page column. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background px-4 sm:-mx-6 sm:px-6">
        <div className={PAGE_COLUMN}>
          <PaneTabs />
          {sectionNav ? (
            <div className={cn(activePane !== "form" && "max-lg:hidden")}>{sectionNav}</div>
          ) : null}
        </div>
      </div>
      <div className="pt-4 sm:pt-6">{panes}</div>
      {footerBar}
    </Tabs>
  );
}
