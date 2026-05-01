import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import { parseCreateDraftListingResponse } from "./api";

export function useCreateDraftListingQuery() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/listing-drafts", {
        method: "POST",
      });

      return await parseCreateDraftListingResponse(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myListings() });
    },
  });

  return {
    createDraftListing: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
  };
}
