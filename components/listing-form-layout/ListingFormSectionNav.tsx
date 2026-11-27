"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ListingFormSectionLink = {
  id: string;
  label: string;
  /** Short progress text such as "2 of 5 required" or "3 photos". */
  meta?: string;
  isComplete?: boolean;
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
      { rootMargin: "-15% 0px -70% 0px" },
    );
    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [idsKey]);

  return [activeId, setActiveId] as const;
}

/** The left rail: every section of the form, where you are, and what's left to fill in. */
export function ListingFormSectionNav({ sections }: { sections: ListingFormSectionLink[] }) {
  const [activeId, setActiveId] = useActiveSection(sections.map((section) => section.id));

  return (
    <nav aria-label="Form sections">
      <p className="mb-2 px-3 text-sm font-medium text-muted-foreground">Sections</p>
      <ul className="space-y-0.5">
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setActiveId(section.id);
                  scrollToSection(section.id);
                }}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-background font-medium text-foreground shadow-xs ring-1 ring-foreground/10"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{section.label}</span>
                  {section.meta ? (
                    <span className="block text-sm font-normal text-muted-foreground">
                      {section.meta}
                    </span>
                  ) : null}
                </span>
                {section.isComplete ? (
                  <>
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                      className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                      aria-hidden
                    />
                    <span className="sr-only">(complete)</span>
                  </>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A compact section picker for screens without room for the rail. */
export function ListingFormSectionJump({ sections }: { sections: ListingFormSectionLink[] }) {
  return (
    // Always empty, so it reads "Sections" and choosing the current section again still jumps.
    <Select value="" onValueChange={(id) => id && scrollToSection(id)}>
      <SelectTrigger aria-label="Jump to section">
        <SelectValue placeholder="Sections" />
      </SelectTrigger>
      <SelectContent position="popper">
        {sections.map((section) => (
          <SelectItem key={section.id} value={section.id} className="pr-8">
            <span className="flex flex-col">
              <span>{section.label}</span>
              {section.meta ? (
                <span className="text-sm text-muted-foreground">
                  {section.isComplete ? "Done" : section.meta}
                </span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
