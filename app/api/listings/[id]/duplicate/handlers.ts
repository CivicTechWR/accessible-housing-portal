import { TypedNextResponse, type TypedNextRequest } from "next-rest-framework";

import { mapDomainErrorToHttpResponse } from "@/lib/http/map-domain-error";
import { duplicateListingByIdService } from "@/lib/listings/listing.service";
import type { DuplicateListingResponse, ListingParams } from "@/shared/schemas/listings";

type DuplicateListingRouteContext = {
  params: ListingParams;
};

export async function duplicateListingByIdHandler(
  _request: TypedNextRequest<"POST">,
  { params }: DuplicateListingRouteContext,
) {
  const result = await duplicateListingByIdService(params.id);

  if (!result.ok) {
    return mapDomainErrorToHttpResponse(result.error);
  }

  return TypedNextResponse.json<DuplicateListingResponse, 201, "application/json">(result.value, {
    status: 201,
  });
}
