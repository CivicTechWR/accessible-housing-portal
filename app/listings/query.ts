import type { ListingListResponse, ListingQuery, ListingSummary } from "@/shared/schemas/listings";
import type { ListingSearchParams } from "./searchParams";

/** The search page loads results in pages of this size, the API's maximum. */
export const LISTINGS_PAGE_SIZE = 100;
/** The search page stops loading pages once it has this many listings, to bound memory and map pins. */
export const LISTINGS_LOAD_CAP = 500;

/**
 * The filters the search page controls, as `/api/listings` takes them. The page sets its own
 * paging, and `status` and `neighbourhood` are API-only.
 */
export type ListingSearchFilters = Omit<
  ListingQuery,
  "page" | "limit" | "status" | "neighbourhood" | "features"
> & { features?: string[] };

/**
 * Converts the parsed URL state to filters. The server page and the browser both use this, so
 * the same URL gives the same query string on each side and the browser reuses the server's
 * first page.
 */
export function toListingSearchFilters(params: ListingSearchParams): ListingSearchFilters {
  return {
    bathrooms: params.bathrooms ?? undefined,
    bedrooms: params.bedrooms ?? undefined,
    features: params.features.length > 0 ? params.features : undefined,
    // Trimmed here because the server page and `/api/listings` would otherwise search for
    // different text and the loaded pages would not belong to one result set.
    location: params.location?.trim() || undefined,
    maxPrice: params.maxPrice?.toString(),
    minPrice: params.minPrice?.toString(),
    moveInDate: params.moveInDate?.toISOString(),
    sort: params.sort,
  };
}

export function createListingsQueryString(filters: ListingSearchFilters) {
  const params = new URLSearchParams();

  appendQueryParam(params, "bedrooms", filters.bedrooms);
  appendQueryParam(params, "bathrooms", filters.bathrooms);
  appendQueryParam(params, "location", filters.location);
  appendQueryParam(params, "minPrice", filters.minPrice);
  appendQueryParam(params, "maxPrice", filters.maxPrice);
  appendQueryParam(params, "moveInDate", filters.moveInDate);
  appendQueryParam(params, "sort", filters.sort);

  for (const feature of filters.features ?? []) {
    appendQueryParam(params, "features", feature);
  }

  return params.toString();
}

/** The page to request after `lastPage`, or `undefined` once every match or the cap is loaded. */
export function getNextListingsPage(lastPage: ListingListResponse, pages: ListingListResponse[]) {
  const loaded = pages.reduce((count, page) => count + page.data.length, 0);
  const { page, totalPages } = lastPage.pagination;

  return page < totalPages && loaded < LISTINGS_LOAD_CAP ? page + 1 : undefined;
}

/**
 * Joins the loaded pages into one list. Offset paging can return a listing on two pages when
 * one is published between requests, so later copies are dropped to keep ids unique.
 */
export function flattenListingPages(pages: ListingListResponse[]) {
  const listingsById = new Map<string, ListingSummary>();

  for (const page of pages) {
    for (const listing of page.data) {
      if (!listingsById.has(listing.id)) {
        listingsById.set(listing.id, listing);
      }
    }
  }

  return [...listingsById.values()];
}

function appendQueryParam(params: URLSearchParams, key: string, value: string | undefined) {
  if (!value) {
    return;
  }

  params.append(key, value);
}
