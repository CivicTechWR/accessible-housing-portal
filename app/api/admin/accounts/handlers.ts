import { TypedNextResponse, type TypedNextRequest } from "next-rest-framework";

import { mapDomainErrorToHttpResponse } from "@/lib/http/map-domain-error";
import { createAccountService, getAccountsService } from "@/lib/accounts/account.service";
import type {
  AccountQuery,
  AccountListResponse,
  CreateAccountInviteInput,
  CreateAccountResponse,
} from "@/shared/schemas/account-management";

export async function getAccountsHandler(
  request: TypedNextRequest<"GET", string, unknown, AccountQuery>,
) {
  const searchParams = request.nextUrl.searchParams;
  const query: AccountQuery = {
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    role: (searchParams.get("role") ?? undefined) as AccountQuery["role"],
    status: (searchParams.get("status") ?? undefined) as AccountQuery["status"],
    search: searchParams.get("search") ?? undefined,
  };
  const result = await getAccountsService(query);

  if (!result.ok) {
    return mapDomainErrorToHttpResponse(result.error);
  }

  return TypedNextResponse.json<AccountListResponse, 200, "application/json">({
    ...result.value,
  });
}

export async function createAccountHandler(
  request: TypedNextRequest<"POST", "application/json", CreateAccountInviteInput>,
) {
  const body = await request.json();
  const result = await createAccountService(body);

  if (!result.ok) {
    return mapDomainErrorToHttpResponse(result.error);
  }

  return TypedNextResponse.json<CreateAccountResponse, 201, "application/json">(result.value, {
    status: 201,
  });
}
