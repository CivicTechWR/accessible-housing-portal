"use client";

import { useState, useCallback, useEffect, useMemo, useRef, type Ref } from "react";
import { Map, Marker, Popup, type ErrorEvent, type MapRef } from "@vis.gl/react-maplibre";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { Listing } from "@/components/listing-card-list/ListingsCardList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ListingsCard } from "../listings-card/ListingsCard";

const OPENFREEMAP_LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/fiord";

/** Default view centred on Waterloo Region */
const DEFAULT_VIEW = { longitude: -80.52, latitude: 43.46, zoom: 12 } as const;

type MappableListing = Listing & { lat: number; lng: number };

function displayAddress(listing: Listing) {
  return listing.city ? `${listing.address}, ${listing.city}` : listing.address;
}

function pinLabel(listing: Listing) {
  return `$${listing.price.toLocaleString()} per month, ${displayAddress(listing)}`;
}

/**
 * The selected listing, shown as a non-modal dialog so the map stays usable behind it.
 * MapView moves focus into it when it opens; Escape or the close button returns focus to the pin.
 */
function SelectedListing({
  listing,
  variant,
  className,
  onClose,
  ref,
}: {
  listing: Listing;
  variant: "vertical" | "horizontal";
  className?: string;
  onClose: () => void;
  ref: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Listing at ${displayAddress(listing)}`}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className={cn("relative outline-none", className)}
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
        timeAgo={listing.timeAgo}
        imageUrl={listing.imageUrl}
        variant={variant}
      />
      {/* A 44px touch target around a smaller visible circle. */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close listing"
        onClick={onClose}
        className="absolute top-0 right-0 z-20 size-11 rounded-full hover:bg-transparent"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md">
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
        </span>
      </Button>
    </div>
  );
}

export function MapView({ listings }: { listings: Listing[] }) {
  const { resolvedTheme } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mapRef = useRef<MapRef>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const bottomCardRef = useRef<HTMLDivElement>(null);

  const mappableListings = useMemo(
    () =>
      listings.filter(
        (listing): listing is MappableListing =>
          listing.lat !== undefined && listing.lng !== undefined,
      ),
    [listings],
  );

  const selectedListing = useMemo(
    () => mappableListings.find((l) => l.id === selectedId) ?? null,
    [mappableListings, selectedId],
  );

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const closeSelected = useCallback(() => {
    if (selectedId) pinRefs.current[selectedId]?.focus();
    setSelectedId(null);
  }, [selectedId]);

  // Move focus into whichever presentation is showing. CSS hides the other one, and
  // focus() on a hidden element does nothing. Wait a frame because the map popup can be
  // detached and reattached after mount (React Strict Mode does this in development),
  // which would drop focus that was set straight away.
  useEffect(() => {
    if (!selectedListing) return;
    const frame = requestAnimationFrame(() => {
      for (const dialog of [bottomCardRef.current, popupRef.current]) {
        dialog?.focus();
        if (dialog && document.activeElement === dialog) break;
      }
      // The anchored popup doesn't move itself into view, so a pin near the edge would leave
      // part of the card (and its close button) cut off. Pan the map just enough to show it all.
      const popup = popupRef.current;
      const map = mapRef.current;
      if (popup && map && document.activeElement === popup) {
        const card = popup.getBoundingClientRect();
        const bounds = map.getContainer().getBoundingClientRect();
        const margin = 12;
        const overflow = (start: number, end: number, min: number, max: number) =>
          Math.max(0, end - (max - margin)) - Math.max(0, min + margin - start);
        const dx = overflow(card.left, card.right, bounds.left, bounds.right);
        const dy = overflow(card.top, card.bottom, bounds.top, bounds.bottom);
        if (dx || dy) map.panBy([dx, dy]);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedListing]);

  if (mapUnavailable) {
    return (
      <div
        role="status"
        className="flex h-full items-center justify-center bg-muted/30 p-6 text-center text-sm text-muted-foreground"
      >
        The map is unavailable in this browser. Switch to List view to browse listings.
      </div>
    );
  }

  return (
    // A container query picks the presentation: on a narrow map the anchored popup would
    // cover most of it, so the listing shows as a card along the bottom instead.
    <div className="@container relative h-full min-h-0 w-full flex-1">
      <div className="absolute inset-0">
        <Map
          ref={mapRef}
          workerUrl="/maplibre/maplibre-gl-worker.mjs"
          mapStyle={resolvedTheme === "dark" ? OPENFREEMAP_DARK_STYLE : OPENFREEMAP_LIGHT_STYLE}
          initialViewState={DEFAULT_VIEW}
          style={{ width: "100%", height: "100%" }}
          scrollZoom={true}
          onClick={() => setSelectedId(null)}
          onError={({ error }: ErrorEvent) => {
            if (error.name === "GPUInitializationError") {
              setMapUnavailable(true);
            } else {
              console.error(error);
            }
          }}
        >
          {mappableListings.map((listing) => {
            const selected = selectedId === listing.id;
            return (
              <Marker
                key={listing.id}
                longitude={listing.lng}
                latitude={listing.lat}
                anchor="center"
                style={selected ? { zIndex: 2 } : undefined}
                className="focus-within:z-1"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handleMarkerClick(listing.id);
                }}
              >
                {/* The button is a 44px touch target; the visible price pill inside stays compact. */}
                <button
                  type="button"
                  ref={(element) => {
                    pinRefs.current[listing.id] = element;
                  }}
                  aria-label={pinLabel(listing)}
                  aria-haspopup="dialog"
                  aria-expanded={selected}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && selected) setSelectedId(null);
                  }}
                  className="group flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full outline-none"
                >
                  <span
                    className={cn(
                      "rounded-full border border-white px-2.5 py-1 text-xs font-bold text-white shadow-lg transition-transform group-hover:scale-110 group-focus-visible:ring-3 group-focus-visible:ring-foreground group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background",
                      selected ? "bg-blue-600" : "bg-[#3b444b]",
                    )}
                  >
                    ${listing.price.toLocaleString()}
                  </span>
                </button>
              </Marker>
            );
          })}

          {selectedListing && (
            <Popup
              longitude={selectedListing.lng}
              latitude={selectedListing.lat}
              anchor="bottom"
              offset={18}
              closeOnClick={false}
              focusAfterOpen={false}
              onClose={() => setSelectedId(null)}
              // maplibre's popup CSS isn't in a cascade layer, so these need !important to win.
              className="z-50 hidden! overflow-hidden rounded-xl border-none bg-transparent p-0 shadow-xl @lg:flex!"
              maxWidth="320px"
              closeButton={false}
            >
              <SelectedListing
                ref={popupRef}
                listing={selectedListing}
                variant="vertical"
                onClose={closeSelected}
              />
            </Popup>
          )}
        </Map>
      </div>

      {selectedListing && (
        <SelectedListing
          ref={bottomCardRef}
          listing={selectedListing}
          variant="horizontal"
          onClose={closeSelected}
          className="absolute inset-x-3 bottom-10 z-10 @lg:hidden"
        />
      )}
    </div>
  );
}
