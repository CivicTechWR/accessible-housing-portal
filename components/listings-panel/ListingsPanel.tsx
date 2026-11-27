"use client";

import {
  Listing,
  ListingsDisplayMode,
  ListingCardGallery,
} from "@/components/listing-card-list/ListingsCardList";
import { DisplayMode } from "@/components/listing-filter-search-bar/ListingFilterSearchBar";

interface ListingsPanelProps {
  listings: Listing[];
  isLoadingMore: boolean;
  isCapped: boolean;
  displayMode: DisplayMode;
  onHighlightChange?: (id: string | null) => void;
}

export function ListingsPanel({
  listings,
  isLoadingMore,
  isCapped,
  displayMode,
  onHighlightChange,
}: ListingsPanelProps) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden bg-background ${
        displayMode === DisplayMode.LIST ? "flex-1" : "w-full min-w-0 flex-1 lg:basis-1/2"
      }`}
    >
      <ListingCardGallery
        listings={listings}
        isLoadingMore={isLoadingMore}
        isCapped={isCapped}
        onHighlightChange={onHighlightChange}
        mode={
          [DisplayMode.LIST, DisplayMode.MAP_LIST].includes(displayMode)
            ? ListingsDisplayMode.FULLSCREEN
            : ListingsDisplayMode.SIDESCROLL
        }
      />
    </div>
  );
}
