import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PropertySearchIcon } from "@hugeicons/core-free-icons";
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
  /** Called with a listing's id while its card is hovered or focused, and null after. */
  onHighlightChange?: (id: string | null) => void;
}

// Memoized because the search page re-renders on every keystroke in its filters, and this can
// hold hundreds of cards.
export const ListingCardGallery = memo(function ListingCardGallery({
  listings,
  mode,
  isLoadingMore,
  isCapped,
  onHighlightChange,
}: ListingCardGalleryProps) {
  const isFullscreen = mode === ListingsDisplayMode.FULLSCREEN;
  const footer = isLoadingMore
    ? "Loading more listings..."
    : isCapped
      ? `Showing the first ${listings.length} listings. Narrow your filters to see the rest.`
      : null;

  return (
    <ScrollArea className="min-h-0 flex-1 w-full">
      {listings.length === 0 && !isLoadingMore && (
        <div className="mx-4 mt-6 rounded-xl border border-dashed px-6 py-12 text-center sm:mx-6">
          <HugeiconsIcon
            icon={PropertySearchIcon}
            strokeWidth={2}
            className="mx-auto mb-3 size-6 text-muted-foreground"
            aria-hidden
          />
          <p className="text-base font-medium text-foreground">No listings match your search</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another location, a wider price range or fewer filters.
          </p>
        </div>
      )}
      <div
        // Below `md`, leave room at the end for the floating List / Map button.
        className={`grid gap-x-5 gap-y-6 px-4 pt-3 pb-4 max-md:pb-20 sm:px-6 sm:pt-4 ${
          isFullscreen ? "grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))]" : "grid-cols-1"
        }`}
      >
        {listings.map((listing) => (
          <div
            key={listing.id}
            // min-w-0 lets the card's truncated lines shrink instead of widening the grid at 320px.
            className="flex min-w-0"
            onPointerEnter={() => onHighlightChange?.(listing.id)}
            onPointerLeave={() => onHighlightChange?.(null)}
            onFocus={() => onHighlightChange?.(listing.id)}
            onBlur={() => onHighlightChange?.(null)}
          >
            <ListingsCard
              id={listing.id}
              title={listing.title}
              accessibilityFeatures={listing.accessibilityFeatures?.map((feature) => feature.name)}
              price={listing.price}
              address={listing.address}
              city={listing.city}
              beds={listing.beds}
              baths={listing.baths}
              sqft={listing.sqft}
              availableOn={listing.availableOn}
              imageUrl={listing.imageUrl}
              photoCount={listing.photoCount}
              variant={isFullscreen ? "vertical" : "horizontal"}
            />
          </div>
        ))}
      </div>
      {/* Always mounted, and never display: none, so screen readers announce the text when it
          changes. It has no height while empty. */}
      <p role="status" className="px-4 pb-6 text-center text-sm text-muted-foreground empty:pb-0">
        {footer}
      </p>
    </ScrollArea>
  );
});
