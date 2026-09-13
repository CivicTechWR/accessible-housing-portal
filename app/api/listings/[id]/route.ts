import { route, routeOperation } from "next-rest-framework";

import { errorMessageSchema } from "@/shared/schemas/common";
import {
  listingByIdResponseSchema,
  listingParamsSchema,
  patchListingResponseSchema,
  patchListingSchema,
  replaceListingResponseSchema,
  replaceListingSchema,
} from "@/shared/schemas/listings";
import {
  getListingByIdHandler,
  patchListingByIdHandler,
  replaceListingByIdHandler,
} from "./handlers";

export const { GET, PUT, PATCH } = route({
  getListingById: routeOperation({ method: "GET" })
    .input({ params: listingParamsSchema })
    .outputs([
      { status: 200, contentType: "application/json", body: listingByIdResponseSchema },
      { status: 401, contentType: "application/json", body: errorMessageSchema },
      { status: 404, contentType: "application/json", body: errorMessageSchema },
      { status: 400, contentType: "application/json", body: errorMessageSchema },
    ])
    .handler(getListingByIdHandler),

  replaceListingById: routeOperation({ method: "PUT" })
    .input({
      params: listingParamsSchema,
      contentType: "application/json",
      body: replaceListingSchema,
    })
    .outputs([
      { status: 200, contentType: "application/json", body: replaceListingResponseSchema },
      { status: 401, contentType: "application/json", body: errorMessageSchema },
      { status: 403, contentType: "application/json", body: errorMessageSchema },
      { status: 404, contentType: "application/json", body: errorMessageSchema },
      { status: 400, contentType: "application/json", body: errorMessageSchema },
    ])
    .handler(replaceListingByIdHandler),

  patchListingById: routeOperation({ method: "PATCH" })
    .input({
      params: listingParamsSchema,
      contentType: "application/json",
      body: patchListingSchema,
    })
    .outputs([
      { status: 200, contentType: "application/json", body: patchListingResponseSchema },
      { status: 401, contentType: "application/json", body: errorMessageSchema },
      { status: 403, contentType: "application/json", body: errorMessageSchema },
      { status: 404, contentType: "application/json", body: errorMessageSchema },
      { status: 400, contentType: "application/json", body: errorMessageSchema },
    ])
    .handler(patchListingByIdHandler),
});
