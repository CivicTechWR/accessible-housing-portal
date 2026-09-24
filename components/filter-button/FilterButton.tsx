"use client";

import { ToggleIconButton } from "@/components/toggle-icon-button/ToggleIconButton";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterMailIcon } from "@hugeicons/core-free-icons";

export interface FilterButtonProps {
  activeFilterCount: number;
  isFilterOpen: boolean;
  onFilterClick: () => void;
  viewport?: "both" | "mobile" | "desktop";
}

export function FilterButton({
  activeFilterCount,
  isFilterOpen,
  onFilterClick,
  viewport = "both",
}: FilterButtonProps) {
  return (
    <>
      {(viewport === "both" || viewport === "mobile") && (
        <div className="sm:hidden">
          <div className="relative">
            <ToggleIconButton
              isActive={isFilterOpen}
              icon={<HugeiconsIcon icon={FilterMailIcon} strokeWidth={2} />}
              onClick={onFilterClick}
              aria-label="Open filters"
            />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </div>
        </div>
      )}
      {(viewport === "both" || viewport === "desktop") && (
        <div className="hidden sm:block">
          <button
            onClick={onFilterClick}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              isFilterOpen
                ? "border-primary/30 bg-primary/10 text-primary-text hover:bg-primary/20"
                : "border-border bg-background hover:bg-accent"
            }`}
          >
            All Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
}
