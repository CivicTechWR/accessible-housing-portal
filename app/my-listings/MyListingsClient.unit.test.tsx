import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";

import { MyListingsClient } from "./MyListingsClient";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const LISTING_ID = "11111111-1111-4111-8111-111111111111";

const listing = {
  id: LISTING_ID,
  title: "Sunny 2BR near uptown",
  status: "published" as const,
  price: 1850,
  address: "123 Main St",
  city: "Waterloo",
  beds: 2,
  baths: 1,
  sqft: 900,
  imageCount: 0,
  updatedAt: "2026-05-01T12:00:00.000Z",
  editUrl: `/listing-form/${LISTING_ID}`,
  viewUrl: `/listings/${LISTING_ID}`,
};

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

type FetchResponse = { ok: boolean; json: () => Promise<unknown> };

// Holds the archive request open so the test sees the pending state a real request goes through.
function mockPendingFetch() {
  let respond: (response: FetchResponse) => void = () => {};
  const fetchMock = jest.fn(
    (_url: string, _init?: RequestInit) =>
      new Promise<FetchResponse>((resolve) => {
        respond = resolve;
      }),
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, respond: (response: FetchResponse) => respond(response) };
}

const actionsMenuName = `More actions for ${listing.title}`;

function openActionsMenu() {
  fireEvent.keyDown(screen.getByRole("button", { name: actionsMenuName }), { key: "Enter" });
}

async function confirmArchive() {
  render(<MyListingsClient initialListings={[listing]} renderedAt="2026-05-02T12:00:00.000Z" />, {
    wrapper: Wrapper,
  });

  openActionsMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
  const dialog = screen.getByRole("alertdialog", { name: "Archive this listing?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));

  // The row switches to its archived state straight away, with its button disabled.
  await screen.findByText("This listing is archived and is no longer publicly visible.");
  expect(screen.getByRole("button", { name: "Archiving..." })).toBeDisabled();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
}

describe("MyListingsClient archive confirmation", () => {
  it("archives the listing after confirming and moves focus to Restore", async () => {
    const { fetchMock, respond } = mockPendingFetch();

    await confirmArchive();
    respond({ ok: true, json: async () => ({}) });

    await waitFor(() => expect(screen.getByRole("button", { name: "Restore" })).toHaveFocus());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/listings/${LISTING_ID}/archive`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns focus to the actions menu button when the request fails", async () => {
    const { respond } = mockPendingFetch();

    await confirmArchive();
    respond({ ok: false, json: async () => ({ message: "Archive failed." }) });

    await screen.findByText("Archive failed.");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: actionsMenuName })).toHaveFocus(),
    );
  });
});
