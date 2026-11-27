"use client";

import { DynamicFilterGroup } from "@/components/feature-accordian/FeatureAccordian";
import type { ListingFiltersProps } from "@/components/listing-filter/ListingFilter";
import { useListingFilters } from "@/components/listing-filter/useListingFilter";
import {
  DisplayMode,
  FloatingViewToggle,
  ListingFilterSearchBar,
  QuickFilterChips,
  ViewSwitch,
} from "@/components/listing-filter-search-bar/ListingFilterSearchBar";
import { FilterButton } from "@/components/filter-button/FilterButton";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSerializer } from "nuqs";
import { rememberListingSearch } from "@/components/listing-details/BackToResults";
import { ListingsPanel } from "@/components/listings-panel/ListingsPanel";
import { ListingsPanelHeader } from "@/components/listings-panel-header/ListingsPanelHeader";
import type { ListingListResponse, ListingSummary } from "@/shared/schemas/listings";
import dynamic from "next/dynamic";
import { toListingSearchFilters } from "./query";
import { listingSearchParamsParsers } from "./searchParams";
import { useListingsQuery } from "./useListingsQuery";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { atLeastBreakpoint, belowBreakpoint, useMediaQuery } from "@/lib/useMediaQuery";
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

const LazyMapView = dynamic<{ listings: ListingSummary[]; highlightedId?: string | null }>(
  () => import("../../components/map-view/MapView.tsx").then((mod) => mod.MapView),
  { ssr: false, loading: MapLoadingPlaceholder },
);

const serializeSearch = createSerializer(listingSearchParamsParsers);

interface ListingsDashboardProps {
  initialData: ListingListResponse;
  initialQueryString: string;
  /** When the server fetched `initialData`, in epoch milliseconds. */
  initialDataUpdatedAt: number;
  dynamicGroups: DynamicFilterGroup[];
}

export default function ListingsDashboard({
  initialData,
  initialQueryString,
  initialDataUpdatedAt,
  dynamicGroups,
}: ListingsDashboardProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Set when the phone Accessibility chip opens the filter sheet, so it opens at that section.
  const [filterSection, setFilterSection] = useState<"accessibility">();
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const accessibilityChipRef = useRef<HTMLButtonElement>(null);
  const mobileFilterSheetRef = useRef<HTMLDivElement>(null);
  const isMobileViewport = useMediaQuery(belowBreakpoint("sm"));
  // Split view only fits at `lg` (1024px) and up, so phones and tablets get List and Map only.
  // This is `false` until hydration, so nothing that affects first paint may depend on it.
  const isSplitViewAvailable = useMediaQuery(atLeastBreakpoint("lg"));
  const [displayMode, setDisplayMode] = useState<DisplayMode>(DisplayMode.MAP_LIST);
  // The listing whose card is hovered or focused, so the map can highlight its pin.
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
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
    filters,
  } = useListingFilters();
  const filterButtonProps = {
    ...getFilterButtonProps(isFilterOpen, () => {
      setFilterSection(undefined);
      setIsFilterOpen(!isFilterOpen);
    }),
    buttonRef: filterButtonRef,
  };
  const query = useMemo(() => toListingSearchFilters(filters), [filters]);
  // Lets "Back to results" on a listing return to this search.
  useEffect(() => {
    rememberListingSearch(serializeSearch(filters));
  }, [filters]);
  const { listings, total, error, retry, isLoading, isLoadingMore, isPartial, isCapped } =
    useListingsQuery(query, {
      data: initialData,
      queryString: initialQueryString,
      updatedAt: initialDataUpdatedAt,
    });
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
      <h1 className="sr-only">Search listings</h1>
      {/* The toolbar holds the search, the filters and the view switch; the count and sort sit
          over the results. Phones get the search field and a row of quick-filter chips, and the
          view switch as a floating button, to keep the first listing photo high on the screen. */}
      <header className="flex shrink-0 flex-col border-b bg-background">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2 sm:h-16 sm:px-6 sm:py-0">
          <ListingFilterSearchBar
            searchInputProps={searchInputProps}
            priceRangeProps={priceRangeProps}
            bedroomToggleProps={bedroomToggleProps}
            bathroomToggleProps={bathroomToggleProps}
            filterButton={<FilterButton {...filterButtonProps} />}
            accessibilityFilter={{
              groups: dynamicGroups,
              getCheckboxProps: getFeatureCheckboxProps,
              count: filters.features.length,
            }}
          />
          <div className="ml-auto shrink-0 max-md:hidden">
            <ViewSwitch
              displayModes={displayModes}
              value={effectiveDisplayMode}
              onChange={setDisplayMode}
            />
          </div>
        </div>
        <QuickFilterChips
          priceRangeProps={priceRangeProps}
          bedroomToggleProps={bedroomToggleProps}
          bathroomToggleProps={bathroomToggleProps}
          accessibilityCount={filters.features.length}
          accessibilityRef={accessibilityChipRef}
          onAccessibilityClick={() => {
            setFilterSection("accessibility");
            setIsFilterOpen(true);
          }}
          className="pb-2 sm:hidden"
        />
      </header>
      {error ? (
        <AlertBanner
          variant="error"
          size="flush"
          className="flex items-center justify-between gap-3 border-b"
        >
          {error}
          <Button variant="outline" size="sm" onClick={retry}>
            Try again
          </Button>
        </AlertBanner>
      ) : null}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {displayMode !== DisplayMode.MAP ? (
          <ListingsPanel
            listings={listings}
            isLoadingMore={isLoadingMore}
            isCapped={isCapped}
            displayMode={displayMode}
            onHighlightChange={setHighlightedId}
            header={
              <ListingsPanelHeader
                shown={listings.length}
                total={total}
                isPartial={isPartial}
                sortOptionProps={sortOptionProps}
                isLoading={isLoading}
              />
            }
          />
        ) : null}
        {[DisplayMode.MAP, DisplayMode.MAP_LIST].includes(displayMode) && (
          <div
            // In split view, CSS hides the map below `lg`, so the server HTML is right at every width.
            className={`relative min-h-0 min-w-0 flex-1 overflow-hidden ${
              isSplitView ? "hidden lg:block lg:basis-[44%] lg:border-l" : ""
            }`}
          >
            {/* Server and hydration renders both take the placeholder branch, so they match, and
                phones never download the map for a pane they can't see. */}
            {isSplitView && !isSplitViewAvailable ? (
              <MapLoadingPlaceholder />
            ) : (
              <LazyMapView listings={listings} highlightedId={highlightedId} />
            )}
          </div>
        )}
        <FloatingViewToggle
          value={effectiveDisplayMode}
          onChange={setDisplayMode}
          className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 md:hidden"
        />
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
              // The sheet has no SheetTrigger, so Radix has nowhere to return focus on close.
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                (filterSection === "accessibility"
                  ? accessibilityChipRef
                  : filterButtonRef
                ).current?.focus();
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
                  : `${total} ${total === 1 ? "listing matches" : "listings match"}`}
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
                  initialSection={filterSection}
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
                      {error ? "Show listings" : `Show ${total} listing${total !== 1 ? "s" : ""}`}
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
