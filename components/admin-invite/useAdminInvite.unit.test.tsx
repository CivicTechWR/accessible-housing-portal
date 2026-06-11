import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import { useAdminInvite } from "@/components/admin-invite/useAdminInvite";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));

const setQueryDataMock = jest.fn();
const fetchMock = jest.fn<typeof fetch>();
const originalFetch = global.fetch;

afterAll(() => {
  global.fetch = originalFetch;
});

describe("useAdminInvite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useQuery).mockReturnValue({ data: [] } as ReturnType<typeof useQuery>);
    jest.mocked(useQueryClient).mockReturnValue({
      setQueryData: setQueryDataMock,
    } as unknown as ReturnType<typeof useQueryClient>);
    global.fetch = fetchMock;
  });

  it("refreshes recent invites when delivery failed after creating the invite", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "2e42f745-44e8-4ab7-a2a2-c1f42cc8e204",
            email: "tenant@example.org",
            name: "Tenant Example",
            role: "user",
            organization: null,
            invitedAt: "2026-06-11T12:00:00.000Z",
            emailDelivery: "failed",
          },
        ],
      }),
    } as Response);

    const { result } = renderHook(() => useAdminInvite({ shouldHydrateInvites: false }));

    act(() => {
      result.current.handleInviteResult({
        status: "error",
        message: "Account invited, but the email could not be delivered.",
        inviteUrl: "https://housing.example.org/invite?token=manual-link",
      });
    });

    await waitFor(() => {
      expect(setQueryDataMock).toHaveBeenCalledWith(queryKeys.recentInvites(), [
        expect.objectContaining({
          email: "tenant@example.org",
          emailDelivery: "failed",
        }),
      ]);
    });
  });
});
