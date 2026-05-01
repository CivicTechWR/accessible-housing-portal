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
  });

  return { data: result.data ?? null, isLoading: result.isLoading, isError: result.isError };
}
