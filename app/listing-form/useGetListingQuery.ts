import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import { parseListingEditorResponse } from "./api";

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
      const payload = await parseListingEditorResponse(response);
      return payload.data;
    },
    enabled: Boolean(listingId),
    // The form loads a listing into its fields once and then ignores refetches, so it must
    // never start from a cached copy left by an earlier visit. Dropping the cache on unmount
    // makes every open wait for the server's current values.
    gcTime: 0,
  });

  return { data: result.data ?? null, isLoading: result.isLoading, isError: result.isError };
}
