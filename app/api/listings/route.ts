import { route, routeOperation } from "next-rest-framework";

import { errorMessageSchema } from "@/shared/schemas/common";
import { listingListResponseSchema, listingQuerySchema } from "@/shared/schemas/listings";
import { getListingsHandler } from "./handlers";

export const { GET } = route({
  getListings: routeOperation({ method: "GET" })
    .input({ query: listingQuerySchema })
    .outputs([
      { status: 200, contentType: "application/json", body: listingListResponseSchema },
      { status: 401, contentType: "application/json", body: errorMessageSchema },
    ])
    .handler(getListingsHandler),
});
