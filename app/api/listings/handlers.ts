import { TypedNextResponse, type TypedNextRequest } from "next-rest-framework";

import { mapDomainErrorToHttpResponse } from "@/lib/http/map-domain-error";
import { createListingService, getListingsService } from "@/lib/listings/listing.service";
import { getListingsQueryFromURLSearchParams } from "@/app/listings/query";
import type {
  CreateListingInput,
  CreateListingResponse,
  ListingListResponse,
  ListingQuery,
} from "@/shared/schemas/listings";

export async function getListingsHandler(
  request: TypedNextRequest<"GET", string, unknown, ListingQuery>,
) {
  const query = getListingsQueryFromURLSearchParams(request.nextUrl.searchParams);
  const payload = await getListingsService(query);

  return TypedNextResponse.json<ListingListResponse, 200, "application/json">(payload);
}

export async function createListingHandler(
  request: TypedNextRequest<"POST", "application/json", CreateListingInput>,
) {
  const body = await request.json();
  const result = await createListingService(body);

  if (!result.ok) {
    return mapDomainErrorToHttpResponse(result.error);
  }

  return TypedNextResponse.json<CreateListingResponse, 201, "application/json">(result.value, {
    status: 201,
  });
}
