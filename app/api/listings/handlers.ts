import { TypedNextResponse, type TypedNextRequest } from "next-rest-framework";

import { mapDomainErrorToHttpResponse } from "@/lib/http/map-domain-error";
import { createListingService, getListingsService } from "@/lib/listings/listing.service";
import type {
  CreateListingInput,
  CreateListingResponse,
  ListingListResponse,
  ListingQuery,
} from "@/shared/schemas/listings";

export async function getListingsHandler(
  request: TypedNextRequest<"GET", string, unknown, ListingQuery>,
) {
  const searchParams = request.nextUrl.searchParams;
  const rawFeatures = searchParams.getAll("features");
  const query: ListingQuery = {
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    status: (searchParams.get("status") ?? undefined) as ListingQuery["status"],
    neighborhood: searchParams.get("neighborhood") ?? undefined,
    bedrooms: searchParams.get("bedrooms") ?? undefined,
    bathrooms: searchParams.get("bathrooms") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    minPrice: searchParams.get("minPrice") ?? undefined,
    maxPrice: searchParams.get("maxPrice") ?? undefined,
    maxRent: searchParams.get("maxRent") ?? undefined,
    accessibility: (searchParams.get("accessibility") ??
      undefined) as ListingQuery["accessibility"],
    moveInDate: searchParams.get("moveInDate") ?? undefined,
    sort: (searchParams.get("sort") ?? undefined) as ListingQuery["sort"],
    features:
      rawFeatures.length > 1
        ? rawFeatures
        : rawFeatures[0]?.includes(",")
          ? rawFeatures[0].split(",").filter(Boolean)
          : (rawFeatures[0] ?? undefined),
    search: searchParams.get("search") ?? undefined,
  };
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
