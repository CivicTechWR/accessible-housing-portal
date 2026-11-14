"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface FormSectionProps {
  title: string;
  description?: string;
  isSeparated?: boolean;
  children: ReactNode;
}

export function FormSection({ title, description, isSeparated, children }: FormSectionProps) {
  return (
    <div className={isSeparated ? "pt-6 border-t mt-8" : undefined}>
      <h3 className="text-lg font-medium">{title}</h3>
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
    </div>
  );
}

export interface ListingFormLayoutProps {
  formPaneHeader?: ReactNode;
  previewPaneHeader?: ReactNode;
  dividerControl?: ReactNode;
  formContent: ReactNode;
  previewContent?: ReactNode;
  footer?: ReactNode;
  isPreviewExpanded?: boolean;
}

type Pane = "form" | "preview";

const PANES: { value: Pane; label: string }[] = [
  { value: "form", label: "Form" },
  { value: "preview", label: "Preview" },
];

function PaneHeader({ children }: { children: ReactNode }) {
  return <div className="border-b border-foreground/10 px-4 py-3 md:px-6">{children}</div>;
}

function PaneFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex justify-end gap-4 border-t border-foreground/10",
        // Below lg the footer sticks to the bottom of the screen, so Save stays in reach.
        "sticky bottom-0 z-10 -mx-4 -mb-5 mt-8 bg-background px-4 py-3 md:-mx-6 md:-mb-6 md:px-6",
        "lg:static lg:z-auto lg:mx-0 lg:mb-0 lg:mt-10 lg:bg-transparent lg:px-0 lg:pt-8 lg:pb-0",
      )}
    >
      {children}
    </div>
  );
}

function PaneBody({
  children,
  footer,
  isSticky = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  isSticky?: boolean;
}) {
  return (
    <div className={cn("px-4 py-5 md:px-6 md:py-6", isSticky && "lg:sticky lg:top-0")}>
      {children}
      {footer ? <PaneFooter>{footer}</PaneFooter> : null}
    </div>
  );
}

function StickyPaneScroll({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <ScrollArea
      type="always"
      // Below lg the pane scrolls with the page; a visible viewport lets the footer stick to the window.
      className={cn(
        "lg:sticky lg:top-0 lg:h-[calc(100vh-10rem)]",
        "max-lg:[&>[data-slot=scroll-area-viewport]]:overflow-visible! max-lg:[&>[data-slot=scroll-area-scrollbar]]:hidden",
      )}
    >
      <PaneBody footer={footer}>{children}</PaneBody>
    </ScrollArea>
  );
}

function PreviewDivider({ dividerControl }: { dividerControl?: ReactNode }) {
  return (
    <div className="order-1 hidden bg-background lg:order-2 lg:flex lg:border-x lg:border-foreground/10">
      <div className="sticky top-0 flex h-full min-h-[calc(100vh-10rem)] w-full items-stretch justify-center">
        {dividerControl ?? <div className="h-full w-full" />}
      </div>
    </div>
  );
}

/** Tab list shown below lg to pick which pane is visible. */
function PaneTabs() {
  return (
    <div className="sticky top-0 z-20 border-b border-foreground/10 bg-background px-4 py-2 md:px-6 lg:hidden">
      <TabsList
        aria-label="Listing editor view"
        className="grid w-full grid-cols-2 gap-1 p-1 group-data-horizontal/tabs:h-auto"
      >
        {PANES.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className={cn(
              "h-11 border-2 px-3 text-sm",
              // The selected tab gets a border and bold text, not just a color change.
              "data-active:border-foreground data-active:font-semibold data-active:shadow-sm dark:data-active:border-foreground",
            )}
          >
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

export function ListingFormLayout({
  formPaneHeader,
  previewPaneHeader,
  dividerControl,
  formContent,
  previewContent,
  footer,
  isPreviewExpanded = false,
}: ListingFormLayoutProps) {
  const hasPreview = Boolean(previewContent);
  const isExpandedWithPreview = isPreviewExpanded && hasPreview;
  const { activePane, switchPane, containerRef } = usePaneSwitcher();

  const panes = (
    <div
      className={cn(
        "grid grid-cols-1 lg:min-h-[calc(100vh-14rem)]",
        isExpandedWithPreview
          ? "lg:grid-cols-[320px_44px_minmax(0,1fr)] xl:grid-cols-[360px_44px_minmax(0,1fr)]"
          : "lg:grid-cols-[1fr_44px_400px] xl:grid-cols-[1fr_44px_450px]",
      )}
    >
      <PaneSection
        value="form"
        hasTabs={hasPreview}
        className="order-2 min-w-0 bg-muted/60 lg:order-1"
      >
        {formPaneHeader && <PaneHeader>{formPaneHeader}</PaneHeader>}
        {isExpandedWithPreview ? (
          <StickyPaneScroll footer={footer}>{formContent}</StickyPaneScroll>
        ) : (
          <PaneBody footer={footer}>{formContent}</PaneBody>
        )}
      </PaneSection>

      {previewContent && (
        <>
          <PreviewDivider dividerControl={dividerControl} />
          <PaneSection value="preview" hasTabs className="order-1 min-w-0 lg:order-3">
            {previewPaneHeader && <PaneHeader>{previewPaneHeader}</PaneHeader>}
            {isExpandedWithPreview ? (
              <StickyPaneScroll>{previewContent}</StickyPaneScroll>
            ) : (
              <PaneBody isSticky>{previewContent}</PaneBody>
            )}
          </PaneSection>
        </>
      )}
    </div>
  );

  if (!hasPreview) {
    return <div className="w-full">{panes}</div>;
  }

  return (
    <Tabs
      ref={containerRef}
      value={activePane}
      onValueChange={(value) => {
        if (value) switchPane(value as Pane);
      }}
      className="block w-full"
    >
      <PaneTabs />
      {panes}
    </Tabs>
  );
}
