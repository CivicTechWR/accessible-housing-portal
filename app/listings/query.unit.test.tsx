/**
 * @jest-environment node
 */
// jsdom has no `Request` global, and without it the nuqs loader silently returns every default.
import { describe, expect, it } from "@jest/globals";
import { useQueryStates } from "nuqs";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { renderToString } from "react-dom/server";
import type { ListingListResponse, ListingSummary } from "@/shared/schemas/listings";
import {
  createListingsQueryString,
  flattenListingPages,
  getNextListingsPage,
  LISTINGS_LOAD_CAP,
  LISTINGS_PAGE_SIZE,
  toListingSearchFilters,
} from "./query";
import { listingSearchParamsParsers, loadListingSearchParams } from "./searchParams";

/** The query string the browser builds from the URL's nuqs state. */
function clientQueryString(search: string) {
  let queryString = "";

  function ReadFilters() {
    const [params] = useQueryStates(listingSearchParamsParsers);
    queryString = createListingsQueryString(toListingSearchFilters(params));
    return null;
  }

  renderToString(
    <NuqsTestingAdapter searchParams={search}>
      <ReadFilters />
    </NuqsTestingAdapter>,
  );

  return queryString;
}

describe("listing search URLs", () => {
  it("parses the URL into the same query string on the server and in the browser", () => {
    const search =
      "features=elevator,braille_signage&minPrice=900&bedrooms=2%2B&moveInDate=2026-12-01" +
      "&location=%20Waterloo%20&status=draft&neighbourhood=Uptown";
    // Next passes the page its search params as a record.
    const serverParams = loadListingSearchParams(Object.fromEntries(new URLSearchParams(search)));
    const serverQueryString = createListingsQueryString(toListingSearchFilters(serverParams));

    expect(serverQueryString).toBe(clientQueryString(search));
    expect(new URLSearchParams(serverQueryString).getAll("features")).toEqual([
      "elevator",
      "braille_signage",
    ]);
  });
});

function listing(id: string): ListingSummary {
  return {
    id,
    price: 1250,
    address: "12 King St",
    city: "Waterloo",
    beds: 2,
    baths: 1,
    sqft: 800,
    timeAgo: "2 days ago",
  };
}

function page(pageNumber: number, total: number, ids: string[]): ListingListResponse {
  return {
    data: ids.map(listing),
    pagination: {
      page: pageNumber,
      limit: LISTINGS_PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / LISTINGS_PAGE_SIZE),
    },
  };
}

function fullPage(pageNumber: number, total: number) {
  const ids = Array.from({ length: LISTINGS_PAGE_SIZE }, (_, i) => `${pageNumber}-${i}`);
  return page(pageNumber, total, ids);
}

describe("listing search paging", () => {
  it("requests the next page until the last one", () => {
    const first = fullPage(1, 150);
    const last = page(
      2,
      150,
      Array.from({ length: 50 }, (_, i) => `2-${i}`),
    );

    expect(getNextListingsPage(first, [first])).toBe(2);
    expect(getNextListingsPage(last, [first, last])).toBeUndefined();
  });

  it("stops at the load cap even when more pages match", () => {
    const pageCount = LISTINGS_LOAD_CAP / LISTINGS_PAGE_SIZE;
    const pages = Array.from({ length: pageCount }, (_, i) => fullPage(i + 1, 10_000));

    expect(getNextListingsPage(pages[pageCount - 2]!, pages.slice(0, -1))).toBe(pageCount);
    expect(getNextListingsPage(pages[pageCount - 1]!, pages)).toBeUndefined();
  });

  it("keeps the first copy of a listing that appears on two pages", () => {
    const listings = flattenListingPages([
      page(1, 4, ["a", "b"]),
      // A listing published between requests pushes "b" onto page 2 as well.
      page(2, 5, ["b", "c", "d"]),
    ]);

    expect(listings.map(({ id }) => id)).toEqual(["a", "b", "c", "d"]);
  });
});
