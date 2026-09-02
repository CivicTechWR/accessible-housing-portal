import { route, routeOperation } from "next-rest-framework";

import { errorMessageSchema } from "@/shared/schemas/common";
import {
  accountInviteListResponseSchema,
  accountInviteQuerySchema,
} from "@/shared/schemas/account-management";
import { getAccountInvitesHandler } from "./handlers";

export const runtime = "nodejs";

export const { GET } = route({
  getAccountInvites: routeOperation({ method: "GET" })
    .input({ query: accountInviteQuerySchema })
    .outputs([
      {
        status: 200,
        contentType: "application/json",
        body: accountInviteListResponseSchema,
      },
      { status: 401, contentType: "application/json", body: errorMessageSchema },
      { status: 403, contentType: "application/json", body: errorMessageSchema },
    ])
    .handler(getAccountInvitesHandler),
});
