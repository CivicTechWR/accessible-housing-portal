import { TypedNextResponse, type TypedNextRequest } from "next-rest-framework";

import { mapDomainErrorToHttpResponse } from "@/lib/http/map-domain-error";
import { duplicateListingByIdService } from "@/lib/listings/listing.service";
import type {
  DuplicateListingInput,
  DuplicateListingResponse,
  ListingParams,
} from "@/shared/schemas/listings";

type DuplicateListingRouteContext = {
  params: ListingParams;
};

export async function duplicateListingByIdHandler(
  request: TypedNextRequest<"POST", "application/json", DuplicateListingInput>,
  { params }: DuplicateListingRouteContext,
) {
  const body = await request.json();
  const result = await duplicateListingByIdService(params.id, body);

  if (!result.ok) {
    return mapDomainErrorToHttpResponse(result.error);
  }

  return TypedNextResponse.json<DuplicateListingResponse, 201, "application/json">(result.value, {
    status: 201,
  });
}
