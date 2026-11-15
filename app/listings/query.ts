import {
  listingQuerySchema,
  type ListingListResponse,
  type ListingQuery,
  type ListingSummary,
} from "@/shared/schemas/listings";

type RawSearchParams = Record<string, string | string[] | undefined>;

/** The search page loads results in pages of this size, the API's maximum. */
export const LISTINGS_PAGE_SIZE = 100;
/** The search page stops loading pages once it has this many listings, to bound memory and map pins. */
export const LISTINGS_LOAD_CAP = 500;

/** A listing search without paging. The search page always pages through every match itself. */
export type ListingSearchFilters = Omit<ListingQuery, "page" | "limit">;

export function getListingsQueryFromSearchParams(
  searchParams: RawSearchParams,
): ListingSearchFilters {
  const rawFeatures = searchParams.features;

  return listingQuerySchema.parse({
    status: getFirstValue(searchParams.status),
    neighbourhood: getFirstValue(searchParams.neighbourhood),
    bedrooms: getFirstValue(searchParams.bedrooms),
    bathrooms: getFirstValue(searchParams.bathrooms),
    location: getFirstValue(searchParams.location),
    minPrice: getFirstValue(searchParams.minPrice),
    maxPrice: getFirstValue(searchParams.maxPrice),
    moveInDate: getFirstValue(searchParams.moveInDate),
    sort: getFirstValue(searchParams.sort),
    features: rawFeatures,
  });
}

export function createListingsQueryString(query: ListingSearchFilters) {
  const params = new URLSearchParams();

  appendQueryParam(params, "status", query.status);
  appendQueryParam(params, "neighbourhood", query.neighbourhood);
  appendQueryParam(params, "bedrooms", query.bedrooms);
  appendQueryParam(params, "bathrooms", query.bathrooms);
  appendQueryParam(params, "location", query.location);
  appendQueryParam(params, "minPrice", query.minPrice);
  appendQueryParam(params, "maxPrice", query.maxPrice);
  appendQueryParam(params, "moveInDate", query.moveInDate);
  appendQueryParam(params, "sort", query.sort);

  if (Array.isArray(query.features)) {
    for (const feature of query.features) {
      appendQueryParam(params, "features", feature);
    }
  } else {
    appendQueryParam(params, "features", query.features);
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

function getFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function appendQueryParam(params: URLSearchParams, key: string, value: string | undefined) {
  if (!value) {
    return;
  }

  params.append(key, value);
}
