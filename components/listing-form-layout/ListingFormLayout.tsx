"use client";

import { ReactNode, Ref, useLayoutEffect, useRef, useState } from "react";
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

/** One card in the listing form, with an 18px heading and a one-line description. */
export function FormSection({ id, title, description, headerAside, children }: FormSectionProps) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      // Leaves room for the sticky tab bar below lg when the nav scrolls a section into view.
      className="scroll-mt-24 rounded-xl bg-card p-5 text-card-foreground shadow-xs ring-1 ring-foreground/10 sm:p-6 lg:scroll-mt-6"
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
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

export interface ListingFormLayoutProps {
  /** The page title block shown above the form. */
  header?: ReactNode;
  /** The section list shown in a left rail on wide screens. */
  sectionNav?: ReactNode;
  /** A compact section picker shown where the rail doesn't fit. */
  sectionJump?: ReactNode;
  previewPaneHeader?: ReactNode;
  formContent: ReactNode;
  previewContent?: ReactNode;
  /** The sticky bar at the bottom of the screen with save state and the primary action. */
  footer?: ReactNode;
  isPreviewExpanded?: boolean;
}

type Pane = "form" | "preview";

const PANES: { value: Pane; label: string }[] = [
  { value: "form", label: "Form" },
  { value: "preview", label: "Preview" },
];

/** Tab list shown below lg to pick which pane is visible, with the section picker beside it. */
function PaneTabs({
  ref,
  sectionJump,
  isFormActive,
}: {
  ref: Ref<HTMLDivElement>;
  sectionJump?: ReactNode;
  isFormActive: boolean;
}) {
  return (
    <div
      ref={ref}
      className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-foreground/10 bg-background px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden"
    >
      <TabsList
        aria-label="Listing editor view"
        className="grid shrink-0 grid-cols-2 gap-1 p-1 group-data-horizontal/tabs:h-auto"
      >
        {PANES.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className={cn(
              "h-11 border-2 px-4 text-sm",
              // The selected tab gets a border and bold text, not just a color change.
              "data-active:border-foreground data-active:font-semibold data-active:shadow-sm dark:data-active:border-foreground",
            )}
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {sectionJump && isFormActive ? <div className="min-w-0 flex-1">{sectionJump}</div> : null}
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

/** The bar pinned to the bottom of the screen. It spans the page shell's side padding. */
function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-foreground/10 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-4">{children}</div>
    </div>
  );
}

export function ListingFormLayout({
  header,
  sectionNav,
  sectionJump,
  previewPaneHeader,
  formContent,
  previewContent,
  footer,
  isPreviewExpanded = false,
}: ListingFormLayoutProps) {
  const hasPreview = Boolean(previewContent);
  const isExpandedWithPreview = isPreviewExpanded && hasPreview;
  const { activePane, switchPane, containerRef } = usePaneSwitcher();
  const tabBarRef = useRef<HTMLDivElement>(null);
  // The rail shows at xl unless the expanded preview needs the room. Elsewhere the compact
  // picker takes its place: in the tab bar below lg, above the form from lg up.
  const showsRail = Boolean(sectionNav) && !isExpandedWithPreview;

  const panes = (
    <div
      className={cn(
        "mx-auto grid max-w-[1440px] grid-cols-1 gap-6 lg:items-start xl:gap-8",
        !hasPreview
          ? showsRail && "xl:grid-cols-[13rem_minmax(0,1fr)]"
          : isExpandedWithPreview
            ? "lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]"
            : cn(
                "lg:grid-cols-[minmax(0,1fr)_22rem]",
                showsRail
                  ? "xl:grid-cols-[13rem_minmax(0,1fr)_24rem]"
                  : "xl:grid-cols-[minmax(0,1fr)_24rem]",
              ),
      )}
    >
      {showsRail ? (
        <aside className="sticky top-6 hidden self-start xl:block">{sectionNav}</aside>
      ) : null}

      <PaneSection value="form" hasTabs={hasPreview} className="min-w-0">
        {sectionJump ? (
          <div className={cn("mb-4 hidden lg:block", showsRail && "xl:hidden")}>{sectionJump}</div>
        ) : null}
        <div className="space-y-6">{formContent}</div>
      </PaneSection>

      {previewContent && (
        <PaneSection value="preview" hasTabs className="min-w-0 lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
            {previewPaneHeader && (
              <div className="border-b border-foreground/10 px-4 py-3">{previewPaneHeader}</div>
            )}
            {/* Scrolls on its own at lg, so the preview stays beside the field being edited. */}
            <div className="p-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
              {previewContent}
            </div>
          </div>
        </PaneSection>
      )}
    </div>
  );

  const body = (
    <>
      {header ? <div className="mx-auto mb-6 max-w-[1440px]">{header}</div> : null}
      {panes}
      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
    </>
  );

  if (!hasPreview) {
    return <div className="w-full">{body}</div>;
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
      // most of it under the sticky Save bar. "nearest" respects the scroll padding and is a
      // no-op when the field is already fully visible. The sticky tab bar only exists below
      // lg, where the scroll padding is set, so skip it otherwise.
      onFocus={(event) => {
        const tabBar = tabBarRef.current;
        if (
          event.target instanceof HTMLTextAreaElement &&
          tabBar &&
          getComputedStyle(tabBar).display !== "none"
        ) {
          event.target.scrollIntoView({ block: "nearest" });
        }
      }}
      className="block w-full"
    >
      {header ? <div className="mx-auto mb-4 max-w-[1440px] lg:mb-6">{header}</div> : null}
      <PaneTabs ref={tabBarRef} sectionJump={sectionJump} isFormActive={activePane === "form"} />
      <div className="pt-4 lg:pt-0">{panes}</div>
      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
    </Tabs>
  );
}
