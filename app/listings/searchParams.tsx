import {
  createLoader,
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
  parseAsStringLiteral,
  parseAsIsoDateTime,
  type inferParserType,
} from "nuqs/server";

const sortOptions = ["newest", "oldest", "price_asc", "price_desc"] as const;

export const listingSearchParamsParsers = {
  location: parseAsString,
  minPrice: parseAsInteger,
  maxPrice: parseAsInteger,
  bedrooms: parseAsString,
  bathrooms: parseAsString,
  moveInDate: parseAsIsoDateTime,
  sort: parseAsStringLiteral(sortOptions).withDefault("newest"),
  features: parseAsArrayOf(parseAsString).withDefault([]),
};

export type ListingSearchParams = inferParserType<typeof listingSearchParamsParsers>;

/** Parses the search page's URL on the server with the parsers `useQueryStates` uses in the browser. */
export const loadListingSearchParams = createLoader(listingSearchParamsParsers);
