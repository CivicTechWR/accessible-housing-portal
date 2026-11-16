"use client";

import { DynamicFilterGroup } from "@/components/feature-accordian/FeatureAccordian";
import type { ListingFiltersProps } from "@/components/listing-filter/ListingFilter";
import { useListingFilters } from "@/components/listing-filter/useListingFilter";
import {
  DisplayMode,
  ListingFilterSearchBar,
} from "@/components/listing-filter-search-bar/ListingFilterSearchBar";
import { FilterButton } from "@/components/filter-button/FilterButton";
import { useMemo, useRef, useState } from "react";
import { ListingsPanel } from "@/components/listings-panel/ListingsPanel";
import type { ListingListResponse, ListingQuery, ListingSummary } from "@/shared/schemas/listings";
import dynamic from "next/dynamic";
import { useListingsQuery } from "./useListingsQuery";
import { AlertBanner } from "@/components/ui/alert-banner";
import { atLeastBreakpoint, belowBreakpoint, useMediaQuery } from "@/lib/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetTitle } from "@/components/ui/sheet";

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

function MapLoadingPlaceholder() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-muted/30 text-sm text-muted-foreground">
      Loading map...
    </div>
  );
}

const LazyMapView = dynamic<{ listings: ListingSummary[] }>(
  () => import("../../components/map-view/MapView.tsx").then((mod) => mod.MapView),
  { ssr: false, loading: MapLoadingPlaceholder },
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
  // Split view only fits at `lg` (1024px) and up, so phones and tablets get List and Map only.
  // This is `false` until hydration, so nothing that affects first paint may depend on it.
  const isSplitViewAvailable = useMediaQuery(atLeastBreakpoint("lg"));
  const [displayMode, setDisplayMode] = useState<DisplayMode>(DisplayMode.MAP_LIST);
  // Below `lg`, split view shows as List. The stored choice stays Split, so widening past `lg`
  // brings it back.
  const effectiveDisplayMode =
    displayMode === DisplayMode.MAP_LIST && !isSplitViewAvailable ? DisplayMode.LIST : displayMode;
  const isSplitView = displayMode === DisplayMode.MAP_LIST;

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
  // The page shows one page of results; the button reports every match.
  const matchCount = data.pagination.total;
  const displayModes = isSplitViewAvailable
    ? [
        { value: DisplayMode.MAP_LIST, label: "Split" },
        { value: DisplayMode.LIST, label: "List" },
        { value: DisplayMode.MAP, label: "Map" },
      ]
    : [
        { value: DisplayMode.LIST, label: "List" },
        { value: DisplayMode.MAP, label: "Map" },
      ];

  return (
    // data-fullscreen opts into the root layout's full-screen mode, which sizes this page to fill
    // the screen below the site header (see app/layout.tsx).
    <div data-fullscreen className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b bg-background px-4 py-3 sm:flex sm:h-16 sm:items-center sm:gap-4 sm:py-0 lg:gap-6">
        <ListingFilterSearchBar
          searchInputProps={searchInputProps}
          priceRangeProps={priceRangeProps}
          bedroomToggleProps={bedroomToggleProps}
          bathroomToggleProps={bathroomToggleProps}
          displayModeProps={{
            displayModes,
            onChange: (value: string) => setDisplayMode(value as DisplayMode),
            value: effectiveDisplayMode,
          }}
          mobileFilterButton={<FilterButton {...filterButtonProps} viewport="mobile" />}
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
            isLoading={isLoading}
          />
        ) : null}
        {[DisplayMode.MAP, DisplayMode.MAP_LIST].includes(displayMode) && (
          <div
            // In split view, CSS hides the map below `lg`, so the server HTML is right at every width.
            className={`min-h-0 min-w-0 flex-1 overflow-hidden ${
              isSplitView ? "hidden lg:block lg:basis-1/2" : ""
            }`}
          >
            {/* Server and hydration renders both take the placeholder branch, so they match, and
                phones never download the map for a pane they can't see. */}
            {isSplitView && !isSplitViewAvailable ? (
              <MapLoadingPlaceholder />
            ) : (
              <LazyMapView listings={listings} />
            )}
          </div>
        )}
        {/* Rendered outside the list panel so phones can filter in Map view too. */}
        {isMobileViewport ? (
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
              {/* Radix hides the page's result count while the sheet is open, so announce it here.
                  Empty while loading so typing a price doesn't announce every keystroke. */}
              <p role="status" className="sr-only">
                {isLoading || error
                  ? ""
                  : `${matchCount} ${matchCount === 1 ? "listing matches" : "listings match"}`}
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <LazyListingFilters
                  bathroomToggleProps={bathroomToggleProps}
                  bedroomToggleProps={bedroomToggleProps}
                  priceRangeProps={priceRangeProps}
                  getFeatureCheckboxProps={getFeatureCheckboxProps}
                  datePickerProps={datePickerProps}
                  clearFilters={clearFilters}
                  dynamicGroups={dynamicGroups}
                  showActions={false}
                  className="max-w-none border-0"
                />
              </div>
              {/* Filters apply as they change; this only closes the sheet and confirms the count. */}
              <SheetFooter className="flex-row gap-3 border-t p-4">
                <Button
                  variant="outline"
                  className="h-11 flex-1 text-sm"
                  onClick={() => void clearFilters()}
                >
                  Clear
                </Button>
                <SheetClose asChild>
                  <Button className="h-11 flex-1 text-sm">
                    {/* Dimmed while a filter change is still loading, so a stale count reads as pending.
                        After a failed fetch, data still holds the previous response, so drop the count. */}
                    <span className={isLoading ? "opacity-60" : undefined}>
                      {error
                        ? "Show listings"
                        : `Show ${matchCount} listing${matchCount !== 1 ? "s" : ""}`}
                    </span>
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ) : null}
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
