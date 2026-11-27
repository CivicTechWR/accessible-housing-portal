"use client";

import dynamic from "next/dynamic";

function MapPlaceholder() {
  return <div className="size-full animate-pulse bg-muted" />;
}

/**
 * Loaded on the client only, after the rest of the page, so the map library stays out of the
 * listing page's first load.
 */
const LocationMap = dynamic<{ lat: number; lng: number }>(
  () => import("./LocationMap.tsx").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: MapPlaceholder,
  },
);

/** A small, non-interactive map with one marker. The address is shown as text beside it. */
export function ListingLocationMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted dark:border-white/12">
      <LocationMap lat={lat} lng={lng} />
    </div>
  );
}
