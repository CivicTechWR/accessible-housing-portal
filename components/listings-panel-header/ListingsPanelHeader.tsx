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
  const summary = isLoading
    ? "Updating listings..."
    : isPartial
      ? `Showing ${shown} of ${total} listings`
      : `${total} listing${total !== 1 ? "s" : ""} found`;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 bg-background px-4 py-2 sm:gap-3 sm:px-6",
        className,
      )}
    >
      <p className="mr-auto min-w-0 truncate whitespace-nowrap text-sm font-medium text-foreground sm:text-[15px]">
        {summary}
      </p>
      <SortOptionsComponent {...sortOptionProps} />
      {viewSwitch}
    </div>
  );
}
