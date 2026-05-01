"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { queryKeys } from "@/app/query-keys";
import { createListingsQueryString } from "./query";
import type { ListingListResponse, ListingQuery } from "@/shared/schemas/listings";

export function useListingsQuery(
  query: ListingQuery,
  initialData: ListingListResponse,
  initialQueryString: string,
) {
  const queryString = useMemo(() => createListingsQueryString(query), [query]);
  const result = useQuery({
    queryKey: queryKeys.listings(queryString),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/listings?${queryString}`, {
        signal,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch listings.");
      }

      return (await response.json()) as ListingListResponse;
    },
    initialData: queryString === initialQueryString ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  return {
    data: result.data ?? initialData,
    error: result.error instanceof Error ? result.error.message : null,
    isLoading: result.isFetching && queryString !== initialQueryString,
  };
}
