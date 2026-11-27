"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useEdgeFade } from "@/lib/useEdgeFade";
import { AccessibilityMark } from "@/components/ui/accessibility-mark";

/** "recommended" is an empty section that listings should still fill in: accessibility. */
export type ListingFormSectionStatus = "complete" | "incomplete" | "optional" | "recommended";

export type ListingFormSectionLink = {
  id: string;
  label: string;
  /** A one-word label for the phone strip, such as "Details". Falls back to `label`. */
  shortLabel?: string;
  /** Progress in words, such as "2 of 5 required" or "3 photos". Visible from sm. */
  meta: string;
  status: ListingFormSectionStatus;
};

function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  // Move focus to the heading so keyboard and screen reader users continue from there.
  document.getElementById(`${id}-heading`)?.focus({ preventScroll: true });
}

/** Tracks which section is nearest the top of the screen. */
function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0]);
  const idsKey = ids.join(",");

  useEffect(() => {
    // Missing in some test environments; the first section then stays highlighted.
    if (typeof IntersectionObserver === "undefined") return;
    const sectionIds = idsKey.split(",");
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = sectionIds.find((id) => visible.get(id));
        if (first) setActiveId(first);
      },
      // A band across the upper part of the screen: the section crossing it is the current one.
      { rootMargin: "-20% 0px -65% 0px" },
    );
    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [idsKey]);

  return [activeId, setActiveId] as const;
}

/**
 * A horizontal strip of the form's sections, pinned above the form: where you are, and what's
 * left to fill in. Every tab carries its step number, tinted green once the section is done. From
 * sm the progress shows in words under the label, and an empty accessibility section adds the
 * yellow accessibility mark after its label. On phones each tab is the number and a one-word
 * label, and the strip scrolls sideways with faded edges.
 */
export function ListingFormSectionNav({ sections }: { sections: ListingFormSectionLink[] }) {
  const [activeId, setActiveId] = useActiveSection(sections.map((section) => section.id));
  const { ref: listRef, onScroll, style } = useEdgeFade<HTMLUListElement>();

  // Keep the current section in view when the strip scrolls sideways. Sets scrollLeft rather
  // than calling scrollIntoView, which could also scroll the page.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-section-id="${activeId}"]`);
    if (!list || !item) return;
    const start = item.offsetLeft - list.offsetLeft;
    const end = start + item.offsetWidth;
    if (start < list.scrollLeft) list.scrollLeft = start;
    else if (end > list.scrollLeft + list.clientWidth) list.scrollLeft = end - list.clientWidth;
  }, [activeId, listRef]);

  return (
    <nav aria-label="Form sections">
      <ul
        ref={listRef}
        onScroll={onScroll}
        style={style}
        className="relative -mb-px flex snap-x snap-mandatory gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((section, index) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id} data-section-id={section.id} className="shrink-0 snap-start">
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setActiveId(section.id);
                  scrollToSection(section.id);
                }}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-t-md border-b-2 px-3 py-1.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                    section.status === "complete"
                      ? "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
                      : isActive
                        ? "bg-foreground text-background"
                        : "bg-card text-muted-foreground ring-1 ring-border ring-inset",
                  )}
                >
                  {index + 1}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="flex items-center gap-1.5">
                    {section.shortLabel ? (
                      <>
                        <span aria-hidden className="font-medium sm:hidden">
                          {section.shortLabel}
                        </span>
                        <span className="font-medium max-sm:sr-only">{section.label}</span>
                      </>
                    ) : (
                      <span className="font-medium">{section.label}</span>
                    )}
                    {section.status === "recommended" ? (
                      <AccessibilityMark size="sm" className="max-sm:hidden" />
                    ) : null}
                  </span>
                  {/* Read by screen readers at every width; phones show only the step. */}
                  <span className="text-sm text-muted-foreground max-sm:sr-only">
                    {section.meta}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
