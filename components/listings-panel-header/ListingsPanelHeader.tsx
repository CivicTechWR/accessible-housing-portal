"use client";

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
  sortOptionProps: { sortOptions: SortOptionsType[]; onChange: (value: string) => void };
  isLoading?: boolean;
}

export function ListingsPanelHeader({
  shown,
  total,
  isPartial,
  sortOptionProps,
  isLoading = false,
}: ListingsPanelHeaderProps) {
  const summary = isLoading
    ? "Updating listings..."
    : isPartial
      ? `Showing ${shown} of ${total} listings`
      : `${total} listing${total !== 1 ? "s" : ""} found`;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background p-4 sm:flex-nowrap">
      <span className="text-sm text-muted-foreground sm:mr-auto">{summary}</span>
      <div className="min-w-0 flex-1 sm:flex-none">
        <SortOptionsComponent {...sortOptionProps} />
      </div>
    </div>
  );
}
