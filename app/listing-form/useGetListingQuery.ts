import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import { parseListingEditorResponse } from "./api";

export type ListingLoadError = "not-found" | "unavailable";

class ListingNotFoundError extends Error {}

export function useGetListingQuery(listingId?: string) {
  const [isRetrying, setIsRetrying] = useState(false);
  const result = useQuery({
    queryKey: queryKeys.listingEditor(listingId),
    queryFn: async ({ signal }) => {
      if (!listingId) {
        return null;
      }

      const response = await fetch(`/api/listings/${listingId}/editor`, {
        method: "GET",
        signal,
      });
      // The API answers 404 for a listing that doesn't exist and for one the signed-in
      // account can't edit.
      if (response.status === 404) {
        throw new ListingNotFoundError();
      }
      const payload = await parseListingEditorResponse(response);
      return payload.data;
    },
    enabled: Boolean(listingId),
    // A second request can't find a missing listing. Other failures keep the app-wide single retry.
    retry: (failureCount, error) => !(error instanceof ListingNotFoundError) && failureCount < 1,
    // The form loads a listing into its fields once and then ignores refetches, so it must
    // never start from a cached copy left by an earlier visit. Dropping the cache on unmount
    // makes every open wait for the server's current values.
    gcTime: 0,
  });

  const retry = () => {
    setIsRetrying(true);
    void result.refetch().finally(() => setIsRetrying(false));
  };

  // A refetch with no data puts the query back to pending and clears its error. While a retry
  // runs, the error is held and loading is not reported, so the message stays on screen.
  let loadError: ListingLoadError | null = null;
  if (isRetrying) {
    loadError = "unavailable";
  } else if (result.isError) {
    loadError = result.error instanceof ListingNotFoundError ? "not-found" : "unavailable";
  }

  return {
    data: result.data ?? null,
    isLoading: result.isLoading && !isRetrying,
    loadError,
    retry,
    isRetrying,
  };
}
