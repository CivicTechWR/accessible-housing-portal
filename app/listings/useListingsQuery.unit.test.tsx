import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ListingListResponse } from "@/shared/schemas/listings";
import { LISTINGS_PAGE_SIZE } from "./query";
import { useListingsQuery } from "./useListingsQuery";

const TOTAL = 250;

function page(pageNumber: number): ListingListResponse {
  const count = Math.min(LISTINGS_PAGE_SIZE, TOTAL - (pageNumber - 1) * LISTINGS_PAGE_SIZE);

  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `${pageNumber}-${i}`,
      price: 1250,
      address: "12 King St",
      city: "Waterloo",
      beds: 2,
      baths: 1,
      sqft: 800,
      timeAgo: "2 days ago",
    })),
    pagination: {
      page: pageNumber,
      limit: LISTINGS_PAGE_SIZE,
      total: TOTAL,
      totalPages: Math.ceil(TOTAL / LISTINGS_PAGE_SIZE),
    },
  };
}

/** Serves pages from `page()`, except those in `failingPages`, and records the pages requested. */
function mockListingsApi(failingPages: number[] = []) {
  const requestedPages: number[] = [];

  global.fetch = jest.fn<typeof fetch>(async (input) => {
    const pageNumber = Number(new URL(String(input), "http://localhost").searchParams.get("page"));
    requestedPages.push(pageNumber);

    return {
      ok: !failingPages.includes(pageNumber),
      json: async () => page(pageNumber),
    } as Response;
  });

  return requestedPages;
}

function renderListingsQuery() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  });
  const initial = { data: page(1), queryString: "sort=newest", updatedAt: Date.now() };

  return renderHook(() => useListingsQuery({ sort: "newest" }, initial), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("useListingsQuery", () => {
  it("loads the pages after the server-rendered one until every match is shown", async () => {
    const requestedPages = mockListingsApi();
    const { result } = renderListingsQuery();

    expect(result.current.listings).toHaveLength(LISTINGS_PAGE_SIZE);
    expect(result.current.isLoadingMore).toBe(true);

    await waitFor(() => expect(result.current.listings).toHaveLength(TOTAL));
    expect(requestedPages).toEqual([2, 3]);
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.isPartial).toBe(false);
  });

  it("stops at a failed page and picks up again on retry", async () => {
    const requestedPages = mockListingsApi([3]);
    const { result } = renderListingsQuery();

    await waitFor(() => expect(result.current.error).toBe("Failed to fetch listings."));
    expect(requestedPages).toEqual([2, 3]);
    expect(result.current.listings).toHaveLength(2 * LISTINGS_PAGE_SIZE);
    expect(result.current.isPartial).toBe(true);
    expect(result.current.isCapped).toBe(false);

    mockListingsApi();
    result.current.retry();

    await waitFor(() => expect(result.current.listings).toHaveLength(TOTAL));
    expect(result.current.error).toBeNull();
  });
});
