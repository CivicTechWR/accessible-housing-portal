"use client";

import { DynamicFilterGroup } from "@/components/feature-accordian/FeatureAccordian";
import type { ListingFiltersProps } from "@/components/listing-filter/ListingFilter";
import { useListingFilters } from "@/components/listing-filter/useListingFilter";
import {
  DisplayMode,
  ListingFilterSearchBar,
} from "@/components/listing-filter-search-bar/ListingFilterSearchBar";
import { FilterButton } from "@/components/filter-button/FilterButton";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ListingsPanel } from "@/components/listings-panel/ListingsPanel";
import type { ListingListResponse, ListingQuery, ListingSummary } from "@/shared/schemas/listings";
import dynamic from "next/dynamic";
import { useListingsQuery } from "./useListingsQuery";
import { AlertBanner } from "@/components/ui/alert-banner";
import { belowBreakpoint, useMediaQuery } from "@/lib/useMediaQuery";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const LazyListingFilters = dynamic<ListingFiltersProps>(
  () =>
    import("../../components/listing-filter/ListingFilter.tsx").then((mod) => mod.ListingFilters),
  {
    loading: () => (
      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
        Loading filters...
      </div>
    ),
  },
);

const LazyMapView = dynamic<{ listings: ListingSummary[] }>(
  () => import("../../components/map-view/MapView.tsx").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 items-center justify-center bg-muted/30 text-sm text-muted-foreground">
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
  const mobileFilterButtonRef = useRef<HTMLButtonElement>(null);
  const mobileFilterSheetRef = useRef<HTMLDivElement>(null);
  const isMobileViewport = useMediaQuery(belowBreakpoint("sm"));
  const [displayMode, setDisplayMode] = useState<DisplayMode>(DisplayMode.MAP_LIST);
  const [siteHeaderHeight, setSiteHeaderHeight] = useState("6rem");
  const isSplitView = displayMode === DisplayMode.MAP_LIST;
  const shellStyle = {
    "--site-header-height": siteHeaderHeight,
  } as CSSProperties;

  useEffect(() => {
    const siteHeader = document.querySelector<HTMLElement>("[data-site-header='true']");

    if (!siteHeader) {
      return;
    }

    const syncSiteHeaderHeight = () => {
      setSiteHeaderHeight(`${siteHeader.getBoundingClientRect().height}px`);
    };

    syncSiteHeaderHeight();
    window.addEventListener("resize", syncSiteHeaderHeight);

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncSiteHeaderHeight);
    resizeObserver?.observe(siteHeader);

    return () => {
      window.removeEventListener("resize", syncSiteHeaderHeight);
      resizeObserver?.disconnect();
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
  const filterButtonProps = {
    ...getFilterButtonProps(isFilterOpen, () => setIsFilterOpen(!isFilterOpen)),
    mobileButtonRef: mobileFilterButtonRef,
  };
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
    <div
      className="flex h-[calc(100dvh-var(--site-header-height))] min-h-0 flex-col overflow-hidden"
      style={shellStyle}
    >
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
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {displayMode !== DisplayMode.MAP ? (
          <ListingsPanel
            listings={listings}
            displayMode={displayMode}
            sortOptionProps={sortOptionProps}
            filterButtonProps={filterButtonProps}
            mobileFilters={
              isMobileViewport ? (
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetContent
                    side="bottom"
                    aria-describedby={undefined}
                    ref={mobileFilterSheetRef}
                    // Focus the sheet rather than its first field, which would open the phone's keyboard.
                    onOpenAutoFocus={(event) => {
                      event.preventDefault();
                      mobileFilterSheetRef.current?.focus();
                    }}
                    // The filter button isn't a SheetTrigger, so Radix has nowhere to return focus on close.
                    onCloseAutoFocus={(event) => {
                      event.preventDefault();
                      mobileFilterButtonRef.current?.focus();
                    }}
                    className="gap-0 rounded-t-lg bg-background p-0 data-[side=bottom]:max-h-[85dvh]"
                  >
                    {/* ListingFilters renders its own visible "Filters" heading. */}
                    <SheetTitle className="sr-only">Filters</SheetTitle>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                      <LazyListingFilters
                        bathroomToggleProps={bathroomToggleProps}
                        bedroomToggleProps={bedroomToggleProps}
                        priceRangeProps={priceRangeProps}
                        getFeatureCheckboxProps={getFeatureCheckboxProps}
                        datePickerProps={datePickerProps}
                        clearFilters={clearFilters}
                        dynamicGroups={dynamicGroups}
                        className="max-w-none border-0"
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              ) : null
            }
            isLoading={isLoading}
          />
        ) : null}
        {[DisplayMode.MAP, DisplayMode.MAP_LIST].includes(displayMode) && (
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-hidden ${
              isSplitView ? "lg:basis-1/2" : ""
            }`}
          >
            <LazyMapView listings={listings} />
          </div>
        )}
        {isFilterOpen && !isMobileViewport && (
          <aside
            aria-label="Filters"
            className="absolute inset-y-0 right-0 z-30 w-full max-w-sm border-l bg-background shadow-xl"
          >
            <LazyListingFilters
              bathroomToggleProps={bathroomToggleProps}
              bedroomToggleProps={bedroomToggleProps}
              priceRangeProps={priceRangeProps}
              getFeatureCheckboxProps={getFeatureCheckboxProps}
              datePickerProps={datePickerProps}
              clearFilters={clearFilters}
              dynamicGroups={dynamicGroups}
              className="h-full max-w-none overflow-y-auto border-0 bg-background"
            />
          </aside>
        )}
      </main>
    </div>
  );
}
