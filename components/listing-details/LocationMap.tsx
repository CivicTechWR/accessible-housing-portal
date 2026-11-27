"use client";

import { useCallback, useEffect, useRef } from "react";
import { Map, Marker, type MapRef } from "@vis.gl/react-maplibre";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon } from "@hugeicons/core-free-icons";
import { MAP_STYLE_URLS, applyMapStyleOverrides } from "@/components/map-view/mapStyle";

/** A still map of the building's position, in the same restyled basemap as search. */
export function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  // Read when a new style finishes loading, which happens after the theme changes.
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);
  const mapRef = useRef<MapRef>(null);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    applyMapStyleOverrides(map, isDarkRef.current);
    // The compact attribution starts expanded and only folds away when the map is moved, which
    // never happens on this still map. Fold it now; its button still opens it.
    map
      .getContainer()
      .querySelector(".maplibregl-compact-show")
      ?.classList.remove("maplibregl-compact-show");
    map.on("style.load", () => applyMapStyleOverrides(map, isDarkRef.current));
  }, []);

  return (
    <Map
      ref={mapRef}
      workerUrl="/maplibre/maplibre-gl-worker.mjs"
      mapStyle={isDark ? MAP_STYLE_URLS.dark : MAP_STYLE_URLS.light}
      initialViewState={{ latitude: lat, longitude: lng, zoom: 13.5 }}
      style={{ width: "100%", height: "100%" }}
      interactive={false}
      attributionControl={{ compact: true }}
      onLoad={handleLoad}
    >
      <Marker longitude={lng} latitude={lat} anchor="center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_1px_4px_rgba(0,0,0,0.25)] ring-3 ring-white">
          <HugeiconsIcon icon={Home01Icon} strokeWidth={2} className="size-5" aria-hidden />
        </span>
      </Marker>
    </Map>
  );
}
