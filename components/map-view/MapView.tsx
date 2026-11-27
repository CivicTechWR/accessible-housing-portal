"use client";

import { memo, useState, useCallback, useEffect, useMemo, useRef, type Ref } from "react";
import { Map, Marker, Popup, type ErrorEvent, type MapRef } from "@vis.gl/react-maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { Listing } from "@/components/listing-card-list/ListingsCardList";
import { Button } from "@/components/ui/button";
import { formatRent } from "@/lib/listing-format";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { ListingsCard } from "../listings-card/ListingsCard";

const OPENFREEMAP_LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const DEFAULT_VIEW = { ...siteConfig.mapCenter, zoom: 12 } as const;

type PaintProperty = Parameters<MaplibreMap["setPaintProperty"]>[1];

const MINOR_LABELS = [
  "highway_name_other",
  "highway_name_motorway",
  "place_other",
  "place_suburb",
  "place_village",
];
const MAJOR_LABELS = ["place_town", "place_city", "place_city_large"];

/**
 * OpenFreeMap's dark style draws roads, water, parks and labels in near-black on black, so only
 * the motorways read. These paint overrides, by layer id, lift each layer to a colour that does.
 */
const DARK_STYLE_PAINT: Array<[layerIds: string[], property: PaintProperty, value: string]> = [
  [["background"], "background-color", "#14181c"],
  [["water"], "fill-color", "#1d2d3a"],
  [["waterway"], "line-color", "#1d2d3a"],
  [["landuse_residential"], "fill-color", "#171b1f"],
  [["landcover_wood", "landuse_park"], "fill-color", "#18241e"],
  [["building"], "fill-color", "#1b2025"],
  [["building"], "fill-outline-color", "#232a30"],
  [["highway_path"], "line-color", "#262c32"],
  [["highway_minor"], "line-color", "#2c333a"],
  [
    ["highway_major_inner", "highway_major_subtle", "highway_motorway_subtle"],
    "line-color",
    "#3a424a",
  ],
  [["highway_major_casing", "highway_motorway_inner"], "line-color", "#46505a"],
  [["highway_motorway_casing"], "line-color", "#56616c"],
  [["railway", "railway_minor", "railway_transit"], "line-color", "#30373e"],
  [["water_name"], "text-color", "#7f9bb3"],
  [["water_name"], "text-halo-color", "#14181c"],
  [MINOR_LABELS, "text-color", "#9aa4ae"],
  [MAJOR_LABELS, "text-color", "#c4ccd3"],
  [[...MINOR_LABELS, ...MAJOR_LABELS], "text-halo-color", "rgba(20,24,28,0.85)"],
];

function applyDarkStylePaint(map: MaplibreMap) {
  for (const [layerIds, property, value] of DARK_STYLE_PAINT) {
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, value);
    }
  }
}

type MappableListing = Listing & { lat: number; lng: number };

/** At this zoom and closer every listing gets its own pin, even where pins overlap. */
const CLUSTER_MAX_ZOOM = 15;
/** Pins whose centres are closer than this, in screen pixels, merge into one cluster. */
const CLUSTER_RADIUS = { x: 56, y: 30 };

type PinGroup = { lat: number; lng: number; listings: MappableListing[] };

/**
 * Greedily merges pins that would overlap on screen into clusters. Price pins are wide and
 * short, so the overlap test uses a box rather than a circle. Cheap enough to rerun after every
 * pan or zoom for the few hundred listings the search loads.
 */
export function groupOverlappingPins(
  map: { getZoom(): number; project(lngLat: [number, number]): { x: number; y: number } },
  listings: MappableListing[],
  keepSeparate: string | null,
) {
  if (map.getZoom() >= CLUSTER_MAX_ZOOM) return null;
  const groups: Array<PinGroup & { x: number; y: number }> = [];
  for (const listing of listings) {
    const point = map.project([listing.lng, listing.lat]);
    const group =
      listing.id === keepSeparate
        ? undefined
        : groups.find(
            (candidate) =>
              candidate.listings[0]?.id !== keepSeparate &&
              Math.abs(candidate.x - point.x) < CLUSTER_RADIUS.x &&
              Math.abs(candidate.y - point.y) < CLUSTER_RADIUS.y,
          );
    if (group) {
      group.listings.push(listing);
    } else {
      groups.push({
        x: point.x,
        y: point.y,
        lat: listing.lat,
        lng: listing.lng,
        listings: [listing],
      });
    }
  }
  return groups.map(({ listings: members }) => ({
    listings: members,
    lat: members.reduce((sum, l) => sum + l.lat, 0) / members.length,
    lng: members.reduce((sum, l) => sum + l.lng, 0) / members.length,
  }));
}

function displayAddress(listing: Listing) {
  return listing.city ? `${listing.address}, ${listing.city}` : listing.address;
}

function pinLabel(listing: Listing) {
  return `${formatRent(listing.price)} per month, ${displayAddress(listing)}`;
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

// Memoized because the search page re-renders on every keystroke in its filters, and this can
// hold hundreds of pins.
export const MapView = memo(function MapView({
  listings,
  highlightedId = null,
}: {
  listings: Listing[];
  /** A listing to highlight, such as the one whose card is hovered in the list. */
  highlightedId?: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  // Read when a new style finishes loading, which happens after the theme changes.
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mapRef = useRef<MapRef>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const bottomCardRef = useRef<HTMLDivElement>(null);
  // Null until the map has loaded, and whenever every listing should get its own pin.
  const [pinGroups, setPinGroups] = useState<PinGroup[] | null>(null);

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

  // A filter can drop the selected listing. Clear the selection so it doesn't reopen on its own
  // when a later filter brings that listing back. The listings query keeps the previous results
  // while the first page of new results loads, so this doesn't fire until that page arrives.
  if (selectedId && !selectedListing) setSelectedId(null);

  const regroupPins = useCallback(() => {
    const map = mapRef.current;
    if (map) setPinGroups(groupOverlappingPins(map, mappableListings, selectedId));
  }, [mappableListings, selectedId]);

  useEffect(() => {
    regroupPins();
  }, [regroupPins]);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      if (isDarkRef.current) applyDarkStylePaint(map);
      // Switching theme swaps the whole style, which drops the overrides.
      map.on("style.load", () => {
        if (isDarkRef.current) applyDarkStylePaint(map);
      });
    }
    regroupPins();
  }, [regroupPins]);

  const zoomToCluster = useCallback((group: PinGroup) => {
    const map = mapRef.current;
    if (!map) return;
    const lngs = group.listings.map((l) => l.lng);
    const lats = group.listings.map((l) => l.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 96, maxZoom: CLUSTER_MAX_ZOOM, duration: 500 },
    );
  }, []);

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
  // Keyed on the id, not the listing object: a refetch after a filter change returns a new
  // object for the same listing, and that mustn't pull focus away from the filter controls.
  useEffect(() => {
    if (!selectedId) return;
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
  }, [selectedId]);

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
          mapStyle={isDark ? OPENFREEMAP_DARK_STYLE : OPENFREEMAP_LIGHT_STYLE}
          initialViewState={DEFAULT_VIEW}
          style={{ width: "100%", height: "100%" }}
          scrollZoom={true}
          onClick={() => setSelectedId(null)}
          onLoad={handleLoad}
          onMoveEnd={regroupPins}
          onError={({ error }: ErrorEvent) => {
            if (error.name === "GPUInitializationError") {
              setMapUnavailable(true);
            } else {
              console.error(error);
            }
          }}
        >
          {(
            pinGroups ?? mappableListings.map((listing) => ({ ...listing, listings: [listing] }))
          ).map((group) => {
            if (group.listings.length > 1) {
              const count = group.listings.length;
              const containsHighlighted = group.listings.some((l) => l.id === highlightedId);
              return (
                <Marker
                  key={`cluster-${group.listings[0]?.id}`}
                  longitude={group.lng}
                  latitude={group.lat}
                  anchor="center"
                  className={cn("hover:z-1 focus-within:z-1", containsHighlighted && "z-3")}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    zoomToCluster(group);
                  }}
                >
                  <button
                    type="button"
                    aria-label={`${count} listings here. Zoom in to see them.`}
                    className="group flex size-11 cursor-pointer items-center justify-center rounded-full outline-none"
                  >
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg ring-2 ring-white transition-transform group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-ring",
                        containsHighlighted && "scale-125 shadow-xl",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                </Marker>
              );
            }
            const listing = group.listings[0] as MappableListing;
            const selected = selectedId === listing.id;
            const emphasised = selected || highlightedId === listing.id;
            return (
              <Marker
                key={listing.id}
                longitude={listing.lng}
                latitude={listing.lat}
                anchor="center"
                // A class rather than `style`: react-maplibre never removes inline styles it set,
                // so a z-index there would stay after the pin is deselected.
                className={cn(
                  "hover:z-1 focus-within:z-1",
                  selected && "z-2",
                  highlightedId === listing.id && "z-3",
                )}
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
                  {/* Pills match the map: white on the light style, dark grey on the dark one.
                      The selected or highlighted pin turns brand blue. */}
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold shadow-md ring-1 transition-[transform,background-color,color] group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary group-focus-visible:ring-3 group-focus-visible:ring-ring",
                      emphasised
                        ? "scale-110 bg-primary text-primary-foreground ring-primary"
                        : "bg-white text-neutral-900 ring-black/15 dark:bg-[#1f262c] dark:text-white dark:ring-[#3a424a]",
                    )}
                  >
                    {formatRent(listing.price)}
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
                className="w-72"
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
});
