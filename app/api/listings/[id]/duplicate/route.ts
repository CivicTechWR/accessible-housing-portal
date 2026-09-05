import { route, routeOperation } from "next-rest-framework";

import { errorMessageSchema } from "@/shared/schemas/common";
import {
  duplicateListingResponseSchema,
  duplicateListingSchema,
  listingParamsSchema,
} from "@/shared/schemas/listings";
import { duplicateListingByIdHandler } from "./handlers";

export const { POST } = route({
  duplicateListingById: routeOperation({ method: "POST" })
    .input({
      contentType: "application/json",
      body: duplicateListingSchema,
      params: listingParamsSchema,
    })
    .outputs([
      { status: 201, contentType: "application/json", body: duplicateListingResponseSchema },
      { status: 401, contentType: "application/json", body: errorMessageSchema },
      { status: 403, contentType: "application/json", body: errorMessageSchema },
      { status: 404, contentType: "application/json", body: errorMessageSchema },
      { status: 400, contentType: "application/json", body: errorMessageSchema },
    ])
    .handler(duplicateListingByIdHandler),
});
