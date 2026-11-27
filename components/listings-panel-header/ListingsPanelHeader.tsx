"use client";

import type { ReactNode } from "react";
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
  /** The Split / List / Map switch, shown after the sort menu. */
  viewSwitch?: ReactNode;
  className?: string;
}

/** "61 listings found", or progress while loading. Phones show it above the first card. */
export function listingsSummary({
  shown,
  total,
  isPartial,
  isLoading,
}: Pick<ListingsPanelHeaderProps, "shown" | "total" | "isPartial" | "isLoading">) {
  if (isLoading) return "Updating listings...";
  if (isPartial) return `Showing ${shown} of ${total} listings`;
  return `${total} listing${total !== 1 ? "s" : ""} found`;
}

/** The results bar: match count on the left, sort and view controls on the right. */
export function ListingsPanelHeader({
  shown,
  total,
  isPartial,
  sortOptionProps,
  isLoading = false,
  viewSwitch,
  className,
}: ListingsPanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 bg-background px-4 py-2 sm:gap-3 sm:px-6",
        className,
      )}
    >
      <p className="mr-auto min-w-0 truncate text-sm whitespace-nowrap text-muted-foreground">
        {listingsSummary({ shown, total, isPartial, isLoading })}
      </p>
      <SortOptionsComponent {...sortOptionProps} />
      {viewSwitch}
    </div>
  );
}
