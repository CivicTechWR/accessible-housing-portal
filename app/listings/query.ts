import { listingQuerySchema, type ListingQuery } from "@/shared/schemas/listings";

type RawSearchParams = Record<string, string | string[] | undefined>;

export function getListingsQueryFromSearchParams(searchParams: RawSearchParams): ListingQuery {
  const rawFeatures = searchParams.features;

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
    features: rawFeatures,
    search: getFirstValue(searchParams.search),
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

function getFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function appendQueryParam(params: URLSearchParams, key: string, value: string | undefined) {
  if (typeof value !== "string" || value.length === 0) {
    return;
  }

  params.append(key, value);
}
