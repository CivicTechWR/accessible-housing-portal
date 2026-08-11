import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/app/query-keys";
import type { PatchListingInput, ReplaceListingInput } from "@/shared/schemas/listings";
import { parseCreateListingResponse } from "./api";

interface ReplaceListingVariables {
  listingId: string;
  payload: ReplaceListingInput;
}

interface PatchListingVariables {
  listingId: string;
  payload: PatchListingInput;
}

export function useEditListingQuery() {
  const queryClient = useQueryClient();
  const replaceMutation = useMutation({
    mutationFn: async ({ listingId, payload }: ReplaceListingVariables) => {
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
      invalidateListingQueries(queryClient, variables.listingId);
    },
  });
  const patchMutation = useMutation({
    mutationFn: async ({ listingId, payload }: PatchListingVariables) => {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      return await parseCreateListingResponse(response);
    },
    onSuccess: (_data, variables) => {
      invalidateListingQueries(queryClient, variables.listingId);
    },
  });

  return {
    replaceListing: replaceMutation.mutateAsync,
    patchListing: patchMutation.mutateAsync,
    isLoading: replaceMutation.isPending || patchMutation.isPending,
    isError: replaceMutation.isError || patchMutation.isError,
  };
}

function invalidateListingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  listingId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.listingEditor(listingId),
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.myListings() });
  void queryClient.invalidateQueries({ queryKey: ["listings"] });
}
