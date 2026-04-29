import { TypedNextResponse, type TypedNextRequest } from "next-rest-framework";

import { getCustomListingFieldsService } from "@/lib/custom-listing-fields/custom-listing-field.service";
import type {
  CustomListingFieldListResponse,
  CustomListingFieldQuery,
} from "@/shared/schemas/custom-listing-fields";

export async function getCustomListingFieldsHandler(
  request: TypedNextRequest<"GET", string, unknown, CustomListingFieldQuery>,
) {
  const searchParams = request.nextUrl.searchParams;
  const query: CustomListingFieldQuery = {
    publicOnly: (searchParams.get("publicOnly") ??
      undefined) as CustomListingFieldQuery["publicOnly"],
    filterableOnly: (searchParams.get("filterableOnly") ??
      undefined) as CustomListingFieldQuery["filterableOnly"],
    category: searchParams.get("category") ?? undefined,
    groupId: searchParams.get("groupId") ?? undefined,
    type: (searchParams.get("type") ?? undefined) as CustomListingFieldQuery["type"],
  };
  const payload = await getCustomListingFieldsService(query);

  return TypedNextResponse.json<CustomListingFieldListResponse, 200, "application/json">(payload);
}
