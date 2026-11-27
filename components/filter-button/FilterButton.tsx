"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterButtonProps {
  activeFilterCount: number;
  isFilterOpen: boolean;
  onFilterClick: () => void;
  /** Lets the phone filter sheet return focus here when it closes. */
  buttonRef?: Ref<HTMLButtonElement>;
}

/** Opens every filter. Labelled at every width, with a count of the filters in use. */
export function FilterButton({
  activeFilterCount,
  isFilterOpen,
  onFilterClick,
  buttonRef,
}: FilterButtonProps) {
  const isActive = activeFilterCount > 0;

  return (
    <Button
      ref={buttonRef}
      variant="outline"
      onClick={onFilterClick}
      aria-label={isActive ? `Filters, ${activeFilterCount} applied` : "Filters"}
      aria-expanded={isFilterOpen}
      className={cn(
        "shrink-0 gap-2 max-md:h-11 max-sm:gap-1.5 max-sm:px-3",
        isActive && "border-primary-text/60 bg-primary/5 dark:bg-primary/15",
      )}
    >
      <HugeiconsIcon icon={FilterHorizontalIcon} strokeWidth={2} className="size-5" aria-hidden />
      Filters
      {isActive && (
        <span
          aria-hidden
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
        >
          {activeFilterCount}
        </span>
      )}
    </Button>
  );
}
