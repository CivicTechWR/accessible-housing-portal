"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { queryKeys } from "@/app/query-keys";
import {
  createListingsQueryString,
  flattenListingPages,
  getNextListingsPage,
  LISTINGS_PAGE_SIZE,
  type ListingSearchFilters,
} from "./query";
import type { ListingListResponse } from "@/shared/schemas/listings";

/** The server-rendered first page of results, for the filters in `queryString`. */
export interface InitialListings {
  data: ListingListResponse;
  queryString: string;
  /** When the server fetched `data`, in epoch milliseconds. */
  updatedAt: number;
}

/**
 * Loads every listing that matches `filters`, page by page in the background, up to
 * `LISTINGS_LOAD_CAP`.
 */
export function useListingsQuery(filters: ListingSearchFilters, initial: InitialListings) {
  const queryString = useMemo(() => createListingsQueryString(filters), [filters]);
  const isInitialQuery = queryString === initial.queryString;
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isPending,
    isPlaceholderData,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.listings(queryString),
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams(queryString);
      params.set("page", String(pageParam));
      params.set("limit", String(LISTINGS_PAGE_SIZE));
      const response = await fetch(`/api/listings?${params}`, { signal });

      if (!response.ok) {
        throw new Error("Failed to fetch listings.");
      }

      return (await response.json()) as ListingListResponse;
    },
    initialPageParam: 1,
    getNextPageParam: getNextListingsPage,
    initialData: isInitialQuery ? { pages: [initial.data], pageParams: [1] } : undefined,
    // Without this, coming back to the initial filters after their cache entry expired would
    // treat the old server page as fresh and append newly fetched pages to it.
    initialDataUpdatedAt: isInitialQuery ? initial.updatedAt : undefined,
    placeholderData: keepPreviousData,
  });

  // Fetch the remaining pages one after another. A failed page sets `isError`, which stops the
  // chain instead of retrying it on every render. `data` is a dependency because a fast response
  // can land in the same render as the start of its request, so `isFetching` never changes and
  // only the new page re-runs this effect.
  useEffect(() => {
    if (data && hasNextPage && !isFetching && !isError) {
      void fetchNextPage();
    }
  }, [data, fetchNextPage, hasNextPage, isError, isFetching]);

  const pages = data?.pages;
  const listings = useMemo(
    () => flattenListingPages(pages ?? [initial.data]),
    [pages, initial.data],
  );
  const { page, total, totalPages } = (pages?.at(-1) ?? initial.data).pagination;
  const isLoading = isPending || isPlaceholderData;
  const isLoadingMore = hasNextPage && !isError;

  return {
    listings,
    total,
    error: error instanceof Error ? error.message : null,
    /** Refetches the loaded pages after an error. The remaining pages then follow as usual. */
    retry: () => void refetch(),
    /** True while the first page for changed filters loads. The previous results stay on screen. */
    isLoading,
    /** True while later pages are still to come. */
    isLoadingMore,
    /** Loading has stopped short of `total`, because the cap was reached or a page request failed. */
    isPartial: !isLoading && !isLoadingMore && listings.length < total,
    /** Loading stopped at `LISTINGS_LOAD_CAP` with more pages left. */
    isCapped: !isLoading && !hasNextPage && page < totalPages,
  };
}
