"use client";

import {
  SortOptions as SortOptionsType,
  SortOptions as SortOptionsComponent,
} from "@/components/sort-options/SortOptions";
import { Listing } from "@/components/listing-card-list/ListingsCardList";

interface ListingsPanelHeaderProps {
  listings: Listing[];
  sortOptionProps: { sortOptions: SortOptionsType[]; onChange: (value: string) => void };
  isLoading?: boolean;
}

export function ListingsPanelHeader({
  listings,
  sortOptionProps,
  isLoading = false,
}: ListingsPanelHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background p-4 sm:flex-nowrap">
      <span className="text-sm text-muted-foreground sm:mr-auto">
        {isLoading
          ? "Updating listings..."
          : `${listings.length} listing${listings.length !== 1 ? "s" : ""} found`}
      </span>
      <div className="min-w-0 flex-1 sm:flex-none">
        <SortOptionsComponent {...sortOptionProps} />
      </div>
    </div>
  );
}
