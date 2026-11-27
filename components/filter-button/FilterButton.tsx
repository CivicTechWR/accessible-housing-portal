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
  viewport?: "both" | "mobile" | "desktop";
  mobileButtonRef?: Ref<HTMLButtonElement>;
}

function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground",
        className,
      )}
    >
      {count}
    </span>
  );
}

export function FilterButton({
  activeFilterCount,
  isFilterOpen,
  onFilterClick,
  viewport = "both",
  mobileButtonRef,
}: FilterButtonProps) {
  const label = activeFilterCount > 0 ? `Filters, ${activeFilterCount} applied` : "Filters";
  const icon = (
    <HugeiconsIcon icon={FilterHorizontalIcon} strokeWidth={2} className="size-5" aria-hidden />
  );

  return (
    <>
      {(viewport === "both" || viewport === "mobile") && (
        <Button
          ref={mobileButtonRef}
          variant="outline"
          size="icon-lg"
          onClick={onFilterClick}
          aria-label={label}
          aria-expanded={isFilterOpen}
          className="relative shrink-0 sm:hidden"
        >
          {icon}
          {activeFilterCount > 0 && (
            <CountBadge count={activeFilterCount} className="absolute -top-1.5 -right-1.5" />
          )}
        </Button>
      )}
      {(viewport === "both" || viewport === "desktop") && (
        <Button
          variant="outline"
          onClick={onFilterClick}
          aria-label={label}
          aria-expanded={isFilterOpen}
          className={cn(
            "hidden shrink-0 gap-2 sm:inline-flex",
            activeFilterCount > 0 && "border-primary-text/60 bg-primary/5 dark:bg-primary/15",
          )}
        >
          {icon}
          Filters
          {activeFilterCount > 0 && <CountBadge count={activeFilterCount} />}
        </Button>
      )}
    </>
  );
}
