import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import { customListingFieldListResponseSchema } from "@/shared/schemas/custom-listing-fields";

export function useAccessibilityFeaturesQuery() {
  const result = useQuery({
    queryKey: queryKeys.accessibilityFeatures(),
    queryFn: async ({ signal }) => {
      const response = await fetch(
        "/api/custom-listing-fields?publicOnly=true&filterableOnly=true&type=boolean",
        { signal },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch accessibility features");
      }
      const payload = customListingFieldListResponseSchema.parse(await response.json());
      return payload.data;
    },
    staleTime: 5 * 60_000,
  });

  return { data: result.data ?? null, isLoading: result.isLoading, isError: result.isError };
}
