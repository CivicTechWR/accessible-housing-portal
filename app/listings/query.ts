import { listingQuerySchema, type ListingQuery } from "@/shared/schemas/listings";

type RawSearchParams = Record<string, string | string[] | undefined>;

export const LISTING_SORT_OPTIONS = ["newest", "oldest", "price_asc", "price_desc"] as const;
export type ListingSortOption = (typeof LISTING_SORT_OPTIONS)[number];

export function isListingSortOption(value: string): value is ListingSortOption {
  return LISTING_SORT_OPTIONS.includes(value as ListingSortOption);
}

export function getListingsQueryFromSearchParams(searchParams: RawSearchParams): ListingQuery {
  return listingQuerySchema.parse({
    page: getFirstValue(searchParams.page),
    limit: getFirstValue(searchParams.limit),
    status: getFirstValue(searchParams.status),
    neighborhood: getFirstValue(searchParams.neighborhood),
    bedrooms: getFirstValue(searchParams.bedrooms),
    bathrooms: getFirstValue(searchParams.bathrooms),
    location: getFirstValue(searchParams.location),
    minPrice: getFirstValue(searchParams.minPrice),
    maxPrice: getFirstValue(searchParams.maxPrice),
    maxRent: getFirstValue(searchParams.maxRent),
    accessibility: getFirstValue(searchParams.accessibility),
    moveInDate: getFirstValue(searchParams.moveInDate),
    sort: getFirstValue(searchParams.sort),
    features: normalizeFeatureParams(searchParams.features),
    search: getFirstValue(searchParams.search),
  });
}

export function getListingsQueryFromURLSearchParams(searchParams: URLSearchParams): ListingQuery {
  return getListingsQueryFromSearchParams({
    page: getSearchParam(searchParams, "page"),
    limit: getSearchParam(searchParams, "limit"),
    status: getSearchParam(searchParams, "status"),
    neighborhood: getSearchParam(searchParams, "neighborhood"),
    bedrooms: getSearchParam(searchParams, "bedrooms"),
    bathrooms: getSearchParam(searchParams, "bathrooms"),
    location: getSearchParam(searchParams, "location"),
    minPrice: getSearchParam(searchParams, "minPrice"),
    maxPrice: getSearchParam(searchParams, "maxPrice"),
    maxRent: getSearchParam(searchParams, "maxRent"),
    accessibility: getSearchParam(searchParams, "accessibility"),
    moveInDate: getSearchParam(searchParams, "moveInDate"),
    sort: getSearchParam(searchParams, "sort"),
    features: getSearchParams(searchParams, "features"),
    search: getSearchParam(searchParams, "search"),
  });
}

export function createListingsQueryString(query: ListingQuery) {
  const params = new URLSearchParams();

  appendQueryParam(params, "page", query.page);
  appendQueryParam(params, "limit", query.limit);
  appendQueryParam(params, "status", query.status);
  appendQueryParam(params, "neighborhood", query.neighborhood);
  appendQueryParam(params, "bedrooms", query.bedrooms);
  appendQueryParam(params, "bathrooms", query.bathrooms);
  appendQueryParam(params, "location", query.location);
  appendQueryParam(params, "minPrice", query.minPrice);
  appendQueryParam(params, "maxPrice", query.maxPrice);
  appendQueryParam(params, "maxRent", query.maxRent);
  appendQueryParam(params, "accessibility", query.accessibility);
  appendQueryParam(params, "moveInDate", query.moveInDate);
  appendQueryParam(params, "sort", query.sort);
  appendQueryParam(params, "search", query.search);

  if (Array.isArray(query.features)) {
    for (const feature of query.features) {
      appendQueryParam(params, "features", feature);
    }
  } else {
    appendQueryParam(params, "features", query.features);
  }

  return params.toString();
}

function getSearchParam(searchParams: URLSearchParams, key: string) {
  return searchParams.get(key) ?? undefined;
}

function getSearchParams(searchParams: URLSearchParams, key: string) {
  const values = searchParams.getAll(key);
  return values.length > 0 ? values : undefined;
}

function getFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeFeatureParams(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const features = values.flatMap((feature) => feature.split(",")).filter(Boolean);

  return features.length > 0 ? features : undefined;
}

function appendQueryParam(params: URLSearchParams, key: string, value: string | undefined) {
  if (!value) {
    return;
  }

  params.append(key, value);
}
