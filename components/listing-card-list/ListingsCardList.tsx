import { memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ListingSummary } from "@/shared/schemas/listings";
import { ListingsCard } from "../listings-card/ListingsCard";

export type Listing = ListingSummary;

export enum ListingsDisplayMode {
  SIDESCROLL = "sidescroll",
  FULLSCREEN = "fullscreen",
}

interface ListingCardGalleryProps {
  listings: Listing[];
  mode: ListingsDisplayMode;
  /** More pages are still to come. */
  isLoadingMore: boolean;
  /** Loading stopped at the cap, with more matches left. */
  isCapped: boolean;
}

// Memoized because the search page re-renders on every keystroke in its filters, and this can
// hold hundreds of cards.
export const ListingCardGallery = memo(function ListingCardGallery({
  listings,
  mode,
  isLoadingMore,
  isCapped,
}: ListingCardGalleryProps) {
  const isFullscreen = mode === ListingsDisplayMode.FULLSCREEN;
  const footer = isLoadingMore
    ? "Loading more listings..."
    : isCapped
      ? `Showing the first ${listings.length} listings. Narrow your filters to see the rest.`
      : null;

  return (
    <ScrollArea className="min-h-0 flex-1 w-full">
      <div
        className={`p-4 grid gap-4 ${
          isFullscreen
            ? "justify-items-center grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]"
            : "grid-cols-1"
        }`}
      >
        {listings.map((listing) => (
          <ListingsCard
            key={listing.id}
            id={listing.id}
            title={listing.title}
            accessibilityFeatures={listing.accessibilityFeatures?.map((feature) => feature.name)}
            price={listing.price}
            address={listing.address}
            city={listing.city}
            beds={listing.beds}
            baths={listing.baths}
            sqft={listing.sqft}
            timeAgo={listing.timeAgo}
            imageUrl={listing.imageUrl}
            variant={isFullscreen ? "vertical" : "horizontal"}
          />
        ))}
      </div>
      {/* Always mounted, and never display: none, so screen readers announce the text when it
          changes. It has no height while empty. */}
      <p role="status" className="px-4 pb-4 text-center text-sm text-muted-foreground empty:pb-0">
        {footer}
      </p>
    </ScrollArea>
  );
});
