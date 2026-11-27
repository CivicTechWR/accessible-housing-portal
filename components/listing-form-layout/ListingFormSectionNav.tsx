"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { useEdgeFade } from "@/lib/useEdgeFade";

export type ListingFormSectionStatus = "complete" | "incomplete" | "optional";

export type ListingFormSectionLink = {
  id: string;
  label: string;
  /** Progress in words for wide screens, such as "2 of 5 required" or "3 photos". */
  meta: string;
  /** The same progress as a short count for the phone strip, such as "2/5" or "3". */
  count?: string;
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

// An untouched section is an empty ring whether or not it's required; the text under the label
// says "Optional" for the ones that are.
const STATUS_ICONS = {
  complete: CheckmarkCircle02Icon,
  incomplete: CircleIcon,
  optional: CircleIcon,
} as const satisfies Record<ListingFormSectionStatus, unknown>;

/**
 * A horizontal strip of the form's sections, pinned above the form: where you are, and what's
 * left to fill in. On phones each tab is one line with its count as a badge, and the strip
 * scrolls sideways with faded edges. From sm every tab has the same 20px status icon slot, so
 * the labels line up, with its progress in words underneath.
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
        {sections.map((section) => {
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
                <HugeiconsIcon
                  icon={STATUS_ICONS[section.status]}
                  strokeWidth={2}
                  className={cn(
                    "size-5 shrink-0 max-sm:hidden",
                    section.status === "complete"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground/70",
                  )}
                  aria-hidden
                />
                <span className="flex flex-col leading-tight">
                  <span className="font-medium">{section.label}</span>
                  {/* Read by screen readers at every width; the phone badge is only visual. */}
                  <span className="text-sm text-muted-foreground max-sm:sr-only">
                    {section.meta}
                  </span>
                </span>
                {section.count ? (
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium tabular-nums sm:hidden",
                      section.status === "complete"
                        ? "bg-emerald-600/10 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {section.count}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
