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
  displayMode: DisplayMode;
  sortOptionProps: { sortOptions: SortOptionsType[]; onChange: (value: string) => void };
  isLoading?: boolean;
}

export function ListingsPanel({
  listings,
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
        listings={listings}
        sortOptionProps={sortOptionProps}
        isLoading={isLoading}
      />
      <ListingCardGallery
        listings={listings}
        mode={
          [DisplayMode.LIST, DisplayMode.MAP_LIST].includes(displayMode)
            ? ListingsDisplayMode.FULLSCREEN
            : ListingsDisplayMode.SIDESCROLL
        }
      />
    </div>
  );
}
