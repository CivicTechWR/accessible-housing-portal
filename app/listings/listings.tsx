"use client";

import { DynamicFilterGroup } from "@/components/feature-accordian/FeatureAccordian";
import { ListingFilters } from "@/components/listing-filter/ListingFilter";
import { useListingFilters } from "@/components/listing-filter/useListingFilter";
import {
  DisplayMode,
  ListingFilterSearchBar,
} from "@/components/listing-filter-search-bar/ListingFilterSearchBar";
import { FilterButton } from "@/components/filter-button/FilterButton";
import { useEffect, useMemo, useState } from "react";
import { ListingsPanel } from "@/components/listings-panel/ListingsPanel";
import type { ListingListResponse, ListingQuery, ListingSummary } from "@/shared/schemas/listings";
import dynamic from "next/dynamic";
import { useListingsQuery } from "./useListingsQuery";
import { AlertBanner } from "@/components/ui/alert-banner";

const LazyMapView = dynamic<{ listings: ListingSummary[] }>(
  () => import("../../components/map-view/MapView.tsx").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Loading map...
      </div>
    ),
  },
);

interface ListingsDashboardProps {
  initialData: ListingListResponse;
  initialQueryString: string;
  dynamicGroups: DynamicFilterGroup[];
}

export default function ListingsDashboard({
  initialData,
  initialQueryString,
  dynamicGroups,
}: ListingsDashboardProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(DisplayMode.MAP_LIST);
  const isSplitView = displayMode === DisplayMode.MAP_LIST;

  useEffect(() => {
    const mobileMediaQuery = window.matchMedia("(max-width: 639px)");
    const syncMobileViewport = () => setIsMobileViewport(mobileMediaQuery.matches);

    syncMobileViewport();
    mobileMediaQuery.addEventListener("change", syncMobileViewport);

    return () => {
      mobileMediaQuery.removeEventListener("change", syncMobileViewport);
    };
  }, []);

  useEffect(() => {
    if (isMobileViewport && displayMode === DisplayMode.MAP_LIST) {
      setDisplayMode(DisplayMode.LIST);
    }
  }, [displayMode, isMobileViewport]);

  const {
    sortOptionProps,
    bedroomToggleProps,
    priceRangeProps,
    searchInputProps,
    bathroomToggleProps,
    getFeatureCheckboxProps,
    datePickerProps,
    clearFilters,
    getFilterButtonProps,
    bathrooms,
    bedrooms,
    features,
    location,
    maxPrice,
    minPrice,
    moveInDate,
    sort,
  } = useListingFilters();
  const filterButtonProps = getFilterButtonProps(isFilterOpen, () =>
    setIsFilterOpen(!isFilterOpen),
  );
  const query = useMemo<ListingQuery>(
    () => ({
      limit: "50",
      bathrooms: bathrooms ?? undefined,
      bedrooms: bedrooms ?? undefined,
      features: features.length > 0 ? features : undefined,
      location: location ?? undefined,
      maxPrice: maxPrice == null ? undefined : maxPrice.toString(),
      minPrice: minPrice == null ? undefined : minPrice.toString(),
      moveInDate: moveInDate?.toISOString(),
      sort: sort as ListingQuery["sort"],
    }),
    [bathrooms, bedrooms, features, location, maxPrice, minPrice, moveInDate, sort],
  );
  const { data, error, isLoading } = useListingsQuery(query, initialData, initialQueryString);
  const listings = data.data;
  const displayModes = isMobileViewport
    ? [
        { value: DisplayMode.LIST, label: "List" },
        { value: DisplayMode.MAP, label: "Map" },
      ]
    : [
        { value: DisplayMode.MAP_LIST, label: "Split" },
        { value: DisplayMode.LIST, label: "List" },
        { value: DisplayMode.MAP, label: "Map" },
      ];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <header className="shrink-0 border-b bg-background px-4 py-3 sm:flex sm:h-16 sm:items-center sm:gap-4 sm:py-0 lg:gap-6">
        <ListingFilterSearchBar
          searchInputProps={searchInputProps}
          priceRangeProps={priceRangeProps}
          bedroomToggleProps={bedroomToggleProps}
          bathroomToggleProps={bathroomToggleProps}
          displayModeProps={{
            displayModes,
            onChange: (value: string) => setDisplayMode(value as DisplayMode),
            value: displayMode,
          }}
        />
        <FilterButton {...filterButtonProps} viewport="desktop" />
      </header>
      {error ? (
        <AlertBanner variant="error" size="flush" className="border-b">
          {error}
        </AlertBanner>
      ) : null}
      <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden lg:flex-row">
        {displayMode !== DisplayMode.MAP ? (
          <ListingsPanel
            listings={listings}
            displayMode={displayMode}
            sortOptionProps={sortOptionProps}
            filterButtonProps={filterButtonProps}
            mobileFilters={
              isFilterOpen && isMobileViewport ? (
                <ListingFilters
                  bathroomToggleProps={bathroomToggleProps}
                  bedroomToggleProps={bedroomToggleProps}
                  priceRangeProps={priceRangeProps}
                  getFeatureCheckboxProps={getFeatureCheckboxProps}
                  datePickerProps={datePickerProps}
                  clearFilters={clearFilters}
                  dynamicGroups={dynamicGroups}
                  className="max-w-none rounded-none border-x-0 border-t-0"
                />
              ) : null
            }
            isLoading={isLoading}
          />
        ) : null}
        {[DisplayMode.MAP, DisplayMode.MAP_LIST].includes(displayMode) && (
          <div
            className={`min-w-0 flex-1 ${isSplitView ? "min-h-[320px] lg:basis-1/2" : "min-h-[400px]"}`}
          >
            <LazyMapView listings={listings} />
          </div>
        )}
        {isFilterOpen && !isMobileViewport && (
          <ListingFilters
            bathroomToggleProps={bathroomToggleProps}
            bedroomToggleProps={bedroomToggleProps}
            priceRangeProps={priceRangeProps}
            getFeatureCheckboxProps={getFeatureCheckboxProps}
            datePickerProps={datePickerProps}
            clearFilters={clearFilters}
            dynamicGroups={dynamicGroups}
          />
        )}
      </main>
    </div>
  );
}
