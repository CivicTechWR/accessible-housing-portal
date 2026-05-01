"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import { buildInviteRecordFromAccountInvite } from "@/components/admin-invite/invite-records";
import type { InviteActionResult, InviteRecord } from "@/components/admin-invite/types";
import { accountInviteListResponseSchema } from "@/shared/schemas/account-management";

const MAX_RECENT_INVITES = 8;
const RECENT_INVITES_API_ENDPOINT = `/api/admin/account-invites?limit=${MAX_RECENT_INVITES}`;

export function useAdminInvite(input?: {
  initialInvites?: InviteRecord[];
  shouldHydrateInvites?: boolean;
}) {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<InviteActionResult | null>(null);
  const shouldHydrateInvites = input?.shouldHydrateInvites ?? true;

  const fetchRecentInvites = useCallback(async () => {
    const response = await fetch(RECENT_INVITES_API_ENDPOINT, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch recent invites.");
    }

    const payload = accountInviteListResponseSchema.parse(await response.json());
    return payload.data.map(buildInviteRecordFromAccountInvite);
  }, []);

  const recentInvitesQuery = useQuery({
    queryKey: queryKeys.recentInvites(),
    queryFn: fetchRecentInvites,
    enabled: shouldHydrateInvites,
    initialData: input?.initialInvites,
  });

  const handleInviteResult = useCallback(
    (result: InviteActionResult) => {
      setLastResult(result);

      if (result.status !== "sent") {
        return;
      }

      void fetchRecentInvites()
        .then((nextInvites) => {
          queryClient.setQueryData(queryKeys.recentInvites(), nextInvites);
        })
        .catch(() => {
          if (!result.invite) {
            return;
          }

          const invite = result.invite;

          queryClient.setQueryData<InviteRecord[]>(queryKeys.recentInvites(), (previous = []) =>
            [invite, ...previous].slice(0, MAX_RECENT_INVITES),
          );
        });
    },
    [fetchRecentInvites, queryClient],
  );

  return {
    invites: recentInvitesQuery.data ?? [],
    lastResult,
    handleInviteResult,
  };
}
