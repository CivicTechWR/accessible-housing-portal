"use client";

import { cn } from "@/lib/utils";
import {
  SortOptions as SortOptionsType,
  SortOptions as SortOptionsComponent,
} from "@/components/sort-options/SortOptions";

interface ListingsPanelHeaderProps {
  /** How many listings are loaded and shown. */
  shown: number;
  /** How many listings match the filters. */
  total: number;
  /** Loading stopped before every match was shown. */
  isPartial: boolean;
  sortOptionProps: {
    sortOptions: SortOptionsType[];
    onChange: (value: string) => void;
    value?: string;
  };
  isLoading?: boolean;
  className?: string;
}

/** "61 listings", or progress while loading. */
export function listingsSummary({
  shown,
  total,
  isPartial,
  isLoading,
}: Pick<ListingsPanelHeaderProps, "shown" | "total" | "isPartial" | "isLoading">) {
  if (isLoading) return "Updating listings...";
  if (isPartial) return `Showing ${shown} of ${total} listings`;
  return `${total} listing${total !== 1 ? "s" : ""}`;
}

/**
 * The heading over the results: the match count, and the sort menu. Phones get a compact,
 * borderless sort trigger that keeps the 44px tap height, so the row stays tight above the first
 * card.
 */
export function ListingsPanelHeader({
  shown,
  total,
  isPartial,
  sortOptionProps,
  isLoading = false,
  className,
}: ListingsPanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 bg-background px-4 pt-3 sm:px-6 sm:pt-4",
        className,
      )}
    >
      <p className="min-w-0 truncate text-[15px] font-semibold text-foreground sm:text-lg">
        {listingsSummary({ shown, total, isPartial, isLoading })}
      </p>
      <SortOptionsComponent
        {...sortOptionProps}
        className="max-sm:-my-2 max-sm:-mr-2 max-sm:border-0 max-sm:bg-transparent max-sm:px-2 max-sm:text-sm max-sm:shadow-none dark:max-sm:bg-transparent"
      />
    </div>
  );
}
