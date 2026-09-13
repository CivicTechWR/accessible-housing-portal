import { route, routeOperation } from "next-rest-framework";

import { errorMessageSchema } from "@/shared/schemas/common";
import {
  createListingResponseSchema,
  createListingSchema,
  listingListResponseSchema,
  listingQuerySchema,
} from "@/shared/schemas/listings";
import { createListingHandler, getListingsHandler } from "./handlers";

export const { GET, POST } = route({
  getListings: routeOperation({ method: "GET" })
    .input({ query: listingQuerySchema })
    .outputs([
      { status: 200, contentType: "application/json", body: listingListResponseSchema },
      { status: 401, contentType: "application/json", body: errorMessageSchema },
    ])
    .handler(getListingsHandler),

  createListing: routeOperation({ method: "POST" })
    .input({ contentType: "application/json", body: createListingSchema })
    .outputs([
      { status: 201, contentType: "application/json", body: createListingResponseSchema },
      { status: 401, contentType: "application/json", body: errorMessageSchema },
      { status: 403, contentType: "application/json", body: errorMessageSchema },
      { status: 400, contentType: "application/json", body: errorMessageSchema },
    ])
    .handler(createListingHandler),
});
