"use client";

import {
  memo,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Ref,
  type RefObject,
} from "react";
import { Map, Marker, Popup, type ErrorEvent, type MapRef } from "@vis.gl/react-maplibre";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import type { Listing } from "@/components/listing-card-list/ListingsCardList";
import { Button } from "@/components/ui/button";
import { formatRent } from "@/lib/listing-format";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { ListingsCard } from "../listings-card/ListingsCard";
import { MAP_STYLE_URLS, applyMapStyleOverrides, foldAttribution } from "./mapStyle";
import "./mapControls.css";

const DEFAULT_VIEW = { ...siteConfig.mapCenter, zoom: 12 } as const;

type MappableListing = Listing & { lat: number; lng: number };

/** At this zoom and closer every listing gets its own pin, even where pins overlap. */
const CLUSTER_MAX_ZOOM = 15;
/** Pins whose centres are closer than this, in screen pixels, merge into one cluster. */
const CLUSTER_RADIUS = { x: 80, y: 34 };

type PinGroup = { lat: number; lng: number; listings: MappableListing[] };

/**
 * Greedily merges pins that would overlap on screen into clusters. Price pins are wide and
 * short, so the overlap test uses a box rather than a circle. Cheap enough to rerun after every
 * pan or zoom for the few hundred listings the search loads.
 *
 * Listings whose position is off screen are left out, so a cluster counts only homes in view
 * and no sliver of a pin shows at the map's edge.
 */
export function groupOverlappingPins(
  map: {
    getZoom(): number;
    project(lngLat: [number, number]): { x: number; y: number };
    getContainer(): { clientWidth: number; clientHeight: number };
  },
  listings: MappableListing[],
  keepSeparate: string | null,
) {
  if (map.getZoom() >= CLUSTER_MAX_ZOOM) return null;
  const { clientWidth, clientHeight } = map.getContainer();
  const groups: Array<PinGroup & { x: number; y: number }> = [];
  for (const listing of listings) {
    const point = map.project([listing.lng, listing.lat]);
    const onScreen =
      point.x >= 0 && point.x <= clientWidth && point.y >= 0 && point.y <= clientHeight;
    if (!onScreen && listing.id !== keepSeparate) continue;
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

/**
 * Prices and clusters share one pill, so the map has one marker family. Light mode uses white pills
 * with near-black text, and dark mode near-black pills with white text, each with a thin border so
 * they hold their edge on the basemap. The hovered, highlighted or selected pin is filled: brand
 * blue in light mode, white in dark mode.
 */
const pillClassName =
  "flex h-7.5 items-center rounded-full border px-3 text-sm font-semibold whitespace-nowrap tabular-nums shadow-[0_1px_4px_rgba(15,23,42,0.18)] transition-[transform,background-color,color,border-color] group-hover:scale-105 group-focus-visible:ring-3 group-focus-visible:ring-ring dark:shadow-[0_2px_6px_rgba(0,0,0,0.6)]";

const restingPill =
  "border-[rgba(15,23,42,0.2)] bg-white text-[#1f262c] dark:border-white/25 dark:bg-[#1f262b] dark:text-white";

const filledPill =
  "border-primary bg-primary text-primary-foreground dark:border-white dark:bg-white dark:text-[#1f262c]";

const hoverFilledPill =
  "group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground dark:group-hover:border-white dark:group-hover:bg-white dark:group-hover:text-[#1f262c]";

function pillTone(emphasised: boolean) {
  return emphasised ? cn("scale-105", filledPill) : cn(restingPill, hoverFilledPill);
}

/** Zooms the map in or out by one step. 40px, in the map's top-right corner. */
function ZoomControls({ mapRef }: { mapRef: RefObject<MapRef | null> }) {
  const buttonClassName =
    "flex size-10 items-center justify-center text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-inset";
  return (
    <div
      role="group"
      aria-label="Zoom"
      className="absolute top-3 right-3 z-10 flex flex-col divide-y overflow-hidden rounded-xl border bg-background shadow-md dark:border-white/15"
    >
      <button
        type="button"
        aria-label="Zoom in"
        className={buttonClassName}
        onClick={() => mapRef.current?.zoomIn()}
      >
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        className={buttonClassName}
        onClick={() => mapRef.current?.zoomOut()}
      >
        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} className="size-5" aria-hidden />
      </button>
    </div>
  );
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

  // Opens on the results, with room around the outermost pins so none sits against an edge.
  // Read once, when the map mounts.
  const [initialView] = useState(() => {
    if (mappableListings.length === 0) return DEFAULT_VIEW;
    const lngs = mappableListings.map((l) => l.lng);
    const lats = mappableListings.map((l) => l.lat);
    return {
      bounds: [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ] as [[number, number], [number, number]],
      fitBoundsOptions: { padding: 80, maxZoom: 14 },
    };
  });

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
      applyMapStyleOverrides(map, isDarkRef.current);
      foldAttribution(map);
      // Switching theme swaps the whole style, which drops the overrides.
      map.on("style.load", () => applyMapStyleOverrides(map, isDarkRef.current));
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
          mapStyle={isDark ? MAP_STYLE_URLS.dark : MAP_STYLE_URLS.light}
          initialViewState={initialView}
          style={{ width: "100%", height: "100%" }}
          scrollZoom={true}
          attributionControl={{ compact: true }}
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
                    className="group flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full outline-none"
                  >
                    <span className={cn(pillClassName, pillTone(containsHighlighted))}>
                      {count} homes
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
                  <span className={cn(pillClassName, pillTone(emphasised))}>
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
      <ZoomControls mapRef={mapRef} />

      {selectedListing && (
        <SelectedListing
          ref={bottomCardRef}
          listing={selectedListing}
          variant="horizontal"
          onClose={closeSelected}
          // Clears the floating List / Map button on phones.
          className="absolute inset-x-3 bottom-20 z-10 @lg:hidden"
        />
      )}
    </div>
  );
});
