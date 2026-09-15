"use client";

import { useState, useCallback, useMemo } from "react";
import { Map, Marker, Popup } from "@vis.gl/react-maplibre";
import { useTheme } from "next-themes";
import type { Listing } from "@/components/listing-card-list/ListingsCardList";
import { ListingsCard } from "../listings-card/ListingsCard";

const OPENFREEMAP_LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/fiord";

/** Default view centred on Waterloo Region */
const DEFAULT_VIEW = { longitude: -80.52, latitude: 43.46, zoom: 12 } as const;

export function MapView({ listings }: { listings: Listing[] }) {
  const { resolvedTheme } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mappableListings = useMemo(
    () =>
      listings.filter(
        (listing): listing is Listing & { lat: number; lng: number } =>
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

  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <div className="absolute inset-0">
        <Map
          mapStyle={resolvedTheme === "dark" ? OPENFREEMAP_DARK_STYLE : OPENFREEMAP_LIGHT_STYLE}
          initialViewState={DEFAULT_VIEW}
          style={{ width: "100%", height: "100%" }}
          scrollZoom={true}
        >
          {mappableListings.map((listing) => (
            <Marker
              key={listing.id}
              longitude={listing.lng}
              latitude={listing.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(listing.id);
              }}
            >
              <div
                className={`cursor-pointer rounded-full border border-white px-2 py-1 text-[10px] font-bold shadow-lg transition-transform hover:scale-110 ${
                  selectedId === listing.id ? "bg-blue-600 text-white" : "bg-[#3b444b] text-white"
                }`}
              >
                ${listing.price.toLocaleString()}
              </div>
            </Marker>
          ))}

          {selectedListing && (
            <Popup
              longitude={selectedListing.lng}
              latitude={selectedListing.lat}
              anchor="bottom"
              offset={28}
              closeOnClick={false}
              onClose={() => setSelectedId(null)}
              className="p-0 z-50 overflow-hidden rounded-xl border-none shadow-xl bg-transparent"
              maxWidth="320px"
              closeButton={false}
            >
              <ListingsCard
                id={selectedListing.id}
                title={selectedListing.title}
                accessibilityFeatures={selectedListing.accessibilityFeatures?.map(
                  (feature) => feature.name,
                )}
                price={selectedListing.price}
                address={selectedListing.address}
                city={selectedListing.city}
                beds={selectedListing.beds}
                baths={selectedListing.baths}
                sqft={selectedListing.sqft}
                timeAgo={selectedListing.timeAgo}
                imageUrl={selectedListing.imageUrl}
                variant="vertical"
              />
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
