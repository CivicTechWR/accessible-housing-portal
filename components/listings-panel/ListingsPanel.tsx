"use client";

import {
  Listing,
  ListingsDisplayMode,
  ListingCardGallery,
} from "@/components/listing-card-list/ListingsCardList";
import { SortOptions as SortOptionsType } from "@/components/sort-options/SortOptions";
import { DisplayMode } from "@/components/listing-filter-search-bar/ListingFilterSearchBar";
import { ListingsPanelHeader } from "@/components/listings-panel-header/ListingsPanelHeader";

interface ListingsPanelProps {
  listings: Listing[];
  /** How many listings match the filters, which can be more than `listings` holds. */
  total: number;
  isLoadingMore: boolean;
  isPartial: boolean;
  isCapped: boolean;
  displayMode: DisplayMode;
  sortOptionProps: { sortOptions: SortOptionsType[]; onChange: (value: string) => void };
  isLoading?: boolean;
}

export function ListingsPanel({
  listings,
  total,
  isLoadingMore,
  isPartial,
  isCapped,
  displayMode,
  sortOptionProps,
  isLoading = false,
}: ListingsPanelProps) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden bg-background ${
        displayMode === DisplayMode.LIST
          ? "flex-1"
          : "min-w-0 w-full flex-1 lg:min-w-0 lg:basis-1/2"
      }`}
    >
      <ListingsPanelHeader
        shown={listings.length}
        total={total}
        isPartial={isPartial}
        sortOptionProps={sortOptionProps}
        isLoading={isLoading}
      />
      <ListingCardGallery
        listings={listings}
        isLoadingMore={isLoadingMore}
        isCapped={isCapped}
        mode={
          [DisplayMode.LIST, DisplayMode.MAP_LIST].includes(displayMode)
            ? ListingsDisplayMode.FULLSCREEN
            : ListingsDisplayMode.SIDESCROLL
        }
      />
    </div>
  );
}
