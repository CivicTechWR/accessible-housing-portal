import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
  parseAsStringEnum,
  parseAsIsoDateTime,
} from "nuqs/server";

const sortOptions = ["newest", "oldest", "price_asc", "price_desc"];

export const listingSearchParamsParsers = {
  location: parseAsString,
  minPrice: parseAsInteger,
  maxPrice: parseAsInteger,
  bedrooms: parseAsString,
  bathrooms: parseAsString,
  moveInDate: parseAsIsoDateTime,
  sort: parseAsStringEnum(sortOptions).withDefault("newest"),
  features: parseAsArrayOf(parseAsString).withDefault([]),
};

export const listingSearchParamsCache = createSearchParamsCache(listingSearchParamsParsers);
