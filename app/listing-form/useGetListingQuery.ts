import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import { parseListingEditorResponse } from "./api";

export type ListingLoadError =
  | { kind: "not-found" }
  | {
      kind: "unavailable";
      /** A retry is in flight. The message stays on screen until it settles. */
      isRetrying: boolean;
      /** A retry has failed too, so the message should say more than it did the first time. */
      hasRetryFailed: boolean;
      retry: () => void;
    };

class ListingNotFoundError extends Error {}

export function useGetListingQuery(listingId?: string) {
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
      // account can't edit, and 400 for an id that isn't a UUID. None of them can be retried.
      if (response.status === 404 || response.status === 400) {
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

  // A refetch with no data puts the query back to pending and clears its error, but keeps
  // errorUpdateCount. So a pending fetch after a failure is a retry, and the message stays on
  // screen in place of the loading skeleton.
  const isRetrying = result.isPending && result.isFetching && result.errorUpdateCount > 0;

  // isLoadingError, not isError: a background refetch that fails while the form is open must
  // not replace the form.
  let loadError: ListingLoadError | null = null;
  if (result.isLoadingError && result.error instanceof ListingNotFoundError) {
    loadError = { kind: "not-found" };
  } else if (result.isLoadingError || isRetrying) {
    loadError = {
      kind: "unavailable",
      isRetrying,
      hasRetryFailed: result.errorUpdateCount > 1,
      retry: () => void result.refetch(),
    };
  }

  return {
    data: result.data ?? null,
    isLoading: result.isLoading && !isRetrying,
    loadError,
  };
}
