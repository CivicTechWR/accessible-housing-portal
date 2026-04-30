import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/app/query-keys";
import type { UpdateListingInput } from "@/shared/schemas/listings";
import { parseCreateListingResponse } from "./api";

interface EditListingInput {
  listingId: string;
  payload: UpdateListingInput;
}

export function useEditListingQuery() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ listingId, payload }: EditListingInput) => {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      return await parseCreateListingResponse(response);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listingEditor(variables.listingId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myListings() });
      void queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });

  return {
    editListing: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
  };
}
