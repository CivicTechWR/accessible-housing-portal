"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useEdgeFade } from "@/lib/useEdgeFade";
import { AccessibilityMark } from "@/components/ui/accessibility-mark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** "recommended" is an empty section that listings should still fill in: accessibility. */
export type ListingFormSectionStatus = "complete" | "incomplete" | "optional" | "recommended";

export type ListingFormSectionLink = {
  id: string;
  label: string;
  /** Progress in words, such as "2 of 5 required" or "3 photos". */
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
 * A section's circle: green with a check once it's finished, otherwise outlined with its number.
 * It doesn't mark the current section; the label's weight and the blue underline do that.
 */
function StepCircle({
  number,
  isActive,
  isComplete,
}: {
  number: number;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
        isComplete
          ? "bg-emerald-600 text-white dark:bg-emerald-600"
          : cn(
              "bg-card ring-1 ring-input ring-inset",
              isActive ? "text-foreground" : "text-muted-foreground",
            ),
      )}
    >
      {isComplete ? (
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="size-3.5" />
      ) : (
        number
      )}
    </span>
  );
}

/**
 * Phones: one full-width button naming the current section ("Section 1 of 5 · Listing details")
 * that opens a menu of every section, and a five-part bar underneath: finished sections are solid
 * blue, the current one is outlined in blue, and the rest are grey.
 */
function SectionMenu({
  sections,
  activeId,
  onSelect,
}: {
  sections: ListingFormSectionLink[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeId),
  );
  const active = sections[activeIndex];
  // Radix keeps the page from scrolling while the menu is open and then returns focus to the
  // trigger, so the jump waits until the menu has closed.
  const pendingId = useRef<string | null>(null);

  return (
    <div className="flex flex-col gap-2 py-2 sm:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="min-w-0 flex-1 truncate">
            <span className="text-muted-foreground">
              Section {activeIndex + 1} of {sections.length} ·{" "}
            </span>
            <span className="font-medium text-foreground">{active?.label}</span>
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width)"
          onCloseAutoFocus={(event) => {
            const id = pendingId.current;
            if (!id) return;
            pendingId.current = null;
            event.preventDefault();
            onSelect(id);
          }}
        >
          {sections.map((section, index) => (
            <DropdownMenuItem
              key={section.id}
              className="min-h-12 gap-3 py-2 aria-[current=location]:bg-muted"
              aria-current={section.id === activeId ? "location" : undefined}
              onSelect={() => {
                pendingId.current = section.id;
              }}
            >
              <StepCircle
                number={index + 1}
                isActive={section.id === activeId}
                isComplete={section.status === "complete"}
              />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span
                  className={cn(
                    "text-base",
                    section.id === activeId ? "font-semibold" : "font-medium",
                  )}
                >
                  {section.label}
                </span>
                <span className="text-sm text-muted-foreground">{section.meta}</span>
              </span>
              {section.status === "recommended" ? <AccessibilityMark size="sm" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* The counts are in the menu; this repeats them as a picture. */}
      <div aria-hidden className="flex gap-1">
        {sections.map((section) => (
          <span
            key={section.id}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              // The outline marks where you are even when every section is finished.
              section.id === activeId
                ? "ring-2 ring-primary ring-inset dark:ring-primary-text"
                : section.status === "complete"
                  ? "bg-primary"
                  : "bg-muted dark:bg-foreground/15",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The form's sections, pinned above the form: where you are, and what's left to fill in. From sm
 * a strip of numbered steps with their progress in words underneath; an empty accessibility
 * section adds the yellow accessibility mark after its label. On phones a menu button and a
 * progress bar take its place.
 */
export function ListingFormSectionNav({ sections }: { sections: ListingFormSectionLink[] }) {
  const [activeId, setActiveId] = useActiveSection(sections.map((section) => section.id));
  const { ref: listRef, onScroll, style } = useEdgeFade<HTMLUListElement>();

  const goTo = (id: string) => {
    setActiveId(id);
    scrollToSection(id);
  };

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
      <SectionMenu sections={sections} activeId={activeId} onSelect={goTo} />
      <ul
        ref={listRef}
        onScroll={onScroll}
        style={style}
        className="relative -mb-px flex snap-x snap-mandatory gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] max-sm:hidden [&::-webkit-scrollbar]:hidden"
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
                  goTo(section.id);
                }}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-t-md border-b-2 px-3 py-1.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <StepCircle
                  number={index + 1}
                  isActive={isActive}
                  isComplete={section.status === "complete"}
                />
                <span className="flex flex-col leading-tight">
                  <span className="flex items-center gap-1.5">
                    <span className={isActive ? "font-semibold" : "font-medium"}>
                      {section.label}
                    </span>
                    {section.status === "recommended" ? <AccessibilityMark size="sm" /> : null}
                  </span>
                  <span className="text-sm text-muted-foreground">{section.meta}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
