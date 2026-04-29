import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
  parseAsStringEnum,
  parseAsIsoDateTime,
} from "nuqs/server";

import { LISTING_SORT_OPTIONS } from "./query";

// 1. Define the raw parsers as a standalone object
export const listingSearchParamsParsers = {
  location: parseAsString,
  minPrice: parseAsInteger,
  maxPrice: parseAsInteger,
  bedrooms: parseAsString,
  bathrooms: parseAsString,
  moveInDate: parseAsIsoDateTime,
  sort: parseAsStringEnum([...LISTING_SORT_OPTIONS]).withDefault("newest"),
  features: parseAsArrayOf(parseAsString).withDefault([]),
};

// 2. Pass the parsers into the server cache
export const listingSearchParamsCache = createSearchParamsCache(listingSearchParamsParsers);
