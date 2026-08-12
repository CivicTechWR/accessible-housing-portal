import { TypedNextResponse, type TypedNextRequest } from "next-rest-framework";

import { mapDomainErrorToHttpResponse } from "@/lib/http/map-domain-error";
import { archiveListingByIdService } from "@/lib/listings/listing.service";
import type { ArchiveListingResponse, ListingParams } from "@/shared/schemas/listings";

type ListingArchiveRouteContext = {
  params: ListingParams;
};

export async function archiveListingByIdHandler(
  _request: TypedNextRequest<"POST">,
  { params }: ListingArchiveRouteContext,
) {
  const result = await archiveListingByIdService(params.id);

  if (!result.ok) {
    return mapDomainErrorToHttpResponse(result.error);
  }

  return TypedNextResponse.json<ArchiveListingResponse, 200, "application/json">({
    ...result.value,
  });
}
