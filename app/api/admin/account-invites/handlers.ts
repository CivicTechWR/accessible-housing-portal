import { TypedNextResponse, type TypedNextRequest } from "next-rest-framework";

import { mapDomainErrorToHttpResponse } from "@/lib/http/map-domain-error";
import { getRecentAccountInvitesService } from "@/lib/accounts/account.service";
import type {
  AccountInviteListResponse,
  AccountInviteQuery,
} from "@/shared/schemas/account-management";

const DEFAULT_RECENT_INVITES_LIMIT = 8;

export async function getAccountInvitesHandler(
  request: TypedNextRequest<"GET", string, unknown, AccountInviteQuery>,
) {
  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limit = rawLimit ? Number(rawLimit) : DEFAULT_RECENT_INVITES_LIMIT;
  const result = await getRecentAccountInvitesService(limit);

  if (!result.ok) {
    return mapDomainErrorToHttpResponse(result.error);
  }

  return TypedNextResponse.json<AccountInviteListResponse, 200, "application/json">({
    ...result.value,
  });
}
