import { route, routeOperation } from "next-rest-framework";

import { errorMessageSchema } from "@/shared/schemas/common";
import { archiveListingResponseSchema, listingParamsSchema } from "@/shared/schemas/listings";
import { archiveListingByIdHandler } from "./handlers";

export const { POST } = route({
  archiveListingById: routeOperation({ method: "POST" })
    .input({ params: listingParamsSchema })
    .outputs([
      { status: 200, contentType: "application/json", body: archiveListingResponseSchema },
      { status: 401, contentType: "application/json", body: errorMessageSchema },
      { status: 403, contentType: "application/json", body: errorMessageSchema },
      { status: 404, contentType: "application/json", body: errorMessageSchema },
    ])
    .handler(archiveListingByIdHandler),
});
