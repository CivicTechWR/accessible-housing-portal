import { TypedNextResponse, type TypedNextRequest } from "next-rest-framework";

import { mapDomainErrorToHttpResponse } from "@/lib/http/map-domain-error";
import {
  createAdminCustomListingFieldService,
  getAdminCustomListingFieldsService,
} from "@/lib/custom-listing-fields/custom-listing-field-admin.service";
import type {
  AdminCustomListingFieldListResponse,
  AdminCustomListingFieldQuery,
  CreateCustomListingFieldInput,
  CreateCustomListingFieldResponse,
} from "@/shared/schemas/custom-listing-fields";

export async function getAdminCustomListingFieldsHandler(
  request: TypedNextRequest<"GET", string, unknown, AdminCustomListingFieldQuery>,
) {
  const searchParams = request.nextUrl.searchParams;
  const query: AdminCustomListingFieldQuery = {
    category: searchParams.get("category") ?? undefined,
    type: (searchParams.get("type") ?? undefined) as AdminCustomListingFieldQuery["type"],
    publicOnly: (searchParams.get("publicOnly") ??
      undefined) as AdminCustomListingFieldQuery["publicOnly"],
    filterableOnly: (searchParams.get("filterableOnly") ??
      undefined) as AdminCustomListingFieldQuery["filterableOnly"],
  };
  const result = await getAdminCustomListingFieldsService(query);

  if (!result.ok) {
    return mapDomainErrorToHttpResponse(result.error);
  }

  return TypedNextResponse.json<AdminCustomListingFieldListResponse, 200, "application/json">(
    result.value,
    { status: 200 },
  );
}

export async function createAdminCustomListingFieldHandler(
  request: TypedNextRequest<"POST", "application/json", CreateCustomListingFieldInput>,
) {
  const body = await request.json();
  const result = await createAdminCustomListingFieldService(body);

  if (!result.ok) {
    return mapDomainErrorToHttpResponse(result.error);
  }

  return TypedNextResponse.json<CreateCustomListingFieldResponse, 201, "application/json">(
    result.value,
    {
      status: 201,
    },
  );
}
