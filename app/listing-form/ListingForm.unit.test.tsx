import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";

import ListingForm from "./ListingForm";
import { patchListingSchema, type PatchListingInput } from "@/shared/schemas/listings";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

// jsdom has no ResizeObserver, which the Radix primitives measure with.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const LISTING_ID = "11111111-1111-4111-8111-111111111111";

const editorResponse = {
  data: {
    id: LISTING_ID,
    title: "123 Main St Apartments",
    description: "A bright family-sized apartment close to transit.",
    buildingType: "apartment",
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1200,
    monthlyRentCents: 235000,
    leaseTerm: 12,
    depositInfo: "First and last month's rent, refundable",
    utilitiesIncluded: ["heat", "water"],
    images: [],
    availableOn: "2026-05-15",
    status: "published",
    name: "123 Main St Apartments",
    street1: "123 Main St",
    city: "Waterloo",
    province: "ON",
    postalCode: "N2J 2H1",
    contactName: "Alex Morgan",
    contactEmail: "leasing@waterloocoop.example.com",
    contactPhone: "519-555-0100",
    customFeatures: [],
  },
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("ListingForm hydration", () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (input: unknown) =>
      String(input).includes("/editor")
        ? { ok: true, status: 200, json: async () => editorResponse }
        : { ok: true, status: 200, json: async () => ({ data: [] }) },
    ) as unknown as typeof fetch;
  });

  it("keeps the persisted building type selected after the listing loads", async () => {
    render(<ListingForm listingId={LISTING_ID} />, { wrapper: Wrapper });

    await screen.findByText("Building Type *");

    const buildingType = () =>
      document.querySelector('[data-field-name="buildingType"] [role="combobox"]');

    await waitFor(() => expect(buildingType()?.textContent).toBe("Apartment"));

    // The hidden native select Radix renders for form participation re-emits its
    // pre-hydration value once the options register, so hold past that echo.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(buildingType()?.textContent).toBe("Apartment");
    expect(buildingType()?.hasAttribute("data-placeholder")).toBe(false);
  });

  it("hydrates the remaining core fields from the editor payload", async () => {
    render(<ListingForm listingId={LISTING_ID} />, { wrapper: Wrapper });

    await screen.findByText("Title *");

    const valueOf = (fieldName: string) =>
      (document.querySelector(`[data-field-name="${fieldName}"] input`) as HTMLInputElement | null)
        ?.value;

    await waitFor(() => expect(valueOf("title")).toBe("123 Main St Apartments"));
    expect(valueOf("leaseTerm")).toBe("12");
    expect(valueOf("bedrooms")).toBe("3");
    expect(valueOf("city")).toBe("Waterloo");
    expect(
      (
        document.querySelector(
          '[data-field-name="depositInfo"] textarea',
        ) as HTMLTextAreaElement | null
      )?.value,
    ).toBe("First and last month's rent, refundable");
  });

  it("selects, autosaves, reloads, and clears a public non-filterable feature", async () => {
    const feature = {
      id: "housing_provider_open_to_accessibility_modifications",
      name: "Housing Provider Open to Accessibility Modifications",
      description: "The housing provider is willing to discuss accessibility modifications.",
    };
    let selected = false;
    const savedSelections: boolean[] = [];
    global.fetch = jest.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      let response: unknown;
      if (init?.method === "PATCH") {
        const patch = patchListingSchema.parse(JSON.parse(String(init.body)));
        selected = patch.accessibilityFeatureIds?.includes(feature.id) ?? selected;
        savedSelections.push(selected);
        response = { data: { id: LISTING_ID } };
      } else if (url.includes("/editor")) {
        response = {
          data: {
            ...editorResponse.data,
            status: "draft",
            customFeatures: selected ? [{ ...feature, category: "Other" }] : [],
          },
        };
      } else {
        const filterableOnly = new URL(url, "http://localhost").searchParams.get("filterableOnly");
        response = {
          data:
            filterableOnly === "true"
              ? []
              : [
                  {
                    groupId: "other",
                    groupLabel: "Other",
                    options: [{ id: feature.id, label: feature.name, type: "boolean" }],
                  },
                ],
        };
      }
      return { ok: true, status: 200, json: async () => response };
    }) as unknown as typeof fetch;

    const firstRender = render(<ListingForm listingId={LISTING_ID} />, { wrapper: Wrapper });
    await screen.findByText(feature.name);
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await waitFor(() => expect(savedSelections).toContain(true), { timeout: 3000 });
    firstRender.unmount();

    render(<ListingForm listingId={LISTING_ID} />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Yes" }).getAttribute("aria-checked")).toBe("true"),
    );
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    await waitFor(() => expect(savedSelections).toEqual([true, false]), { timeout: 3000 });
  });

  it("loads the server's current values when a listing is opened again", async () => {
    let savedTitle = editorResponse.data.title;
    global.fetch = jest.fn(async (input: unknown) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(input).includes("/editor")
          ? { data: { ...editorResponse.data, status: "draft", title: savedTitle } }
          : { data: [] },
    })) as unknown as typeof fetch;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const findTitle = () =>
      screen.findByRole("textbox", { name: (name) => name.startsWith("Title") });

    const firstVisit = render(<ListingForm listingId={LISTING_ID} />, { wrapper });
    await waitFor(async () => expect(await findTitle()).toHaveValue("123 Main St Apartments"));
    firstVisit.unmount();
    // Navigation always yields before the form mounts again; the cache is dropped in that gap.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Renamed from another device or tab while this one was elsewhere in the app.
    savedTitle = "Renamed elsewhere";
    render(<ListingForm listingId={LISTING_ID} />, { wrapper });

    await waitFor(async () => expect(await findTitle()).toHaveValue("Renamed elsewhere"));
  });

  it("keeps a draft's in-progress edits when the autosave refetch returns", async () => {
    let savedTitle = editorResponse.data.title;
    const savedPatches: PatchListingInput[] = [];
    let editorRequests = 0;
    let releaseRefetch = () => {};
    const refetchReleased = new Promise<void>((resolve) => {
      releaseRefetch = resolve;
    });
    global.fetch = jest.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      let response: unknown = { data: [] };
      if (init?.method === "PATCH") {
        const patch = patchListingSchema.parse(JSON.parse(String(init.body)));
        savedPatches.push(patch);
        savedTitle = patch.title ?? savedTitle;
        response = { data: { id: LISTING_ID } };
      } else if (url.includes("/editor")) {
        editorRequests += 1;
        if (editorRequests > 1) {
          await refetchReleased;
        }
        response = { data: { ...editorResponse.data, status: "draft", title: savedTitle } };
      }
      return { ok: true, status: 200, json: async () => response };
    }) as unknown as typeof fetch;

    render(<ListingForm listingId={LISTING_ID} />, { wrapper: Wrapper });
    const title = await screen.findByRole("textbox", { name: (name) => name.startsWith("Title") });
    const bedrooms = screen.getByRole("spinbutton", {
      name: (name) => name.startsWith("Bedrooms"),
    });
    await waitFor(() => expect(bedrooms).toHaveValue(3));

    fireEvent.change(bedrooms, { target: { value: "" } });
    fireEvent.change(title, { target: { value: "Renamed" } });
    await waitFor(() => expect(editorRequests).toBe(2), { timeout: 3000 });

    // Typed after the autosave response, while its refetch is still in flight.
    fireEvent.change(title, { target: { value: "Renamed again" } });
    releaseRefetch();
    await waitFor(() => expect(savedTitle).toBe("Renamed again"), { timeout: 3000 });

    expect(title).toHaveValue("Renamed again");
    expect(bedrooms).toHaveValue(null);
    expect(savedPatches.map((patch) => patch.title)).toEqual(["Renamed", "Renamed again"]);
  });

  it("keeps clearing publish errors as fields are fixed after an autosave refetch", async () => {
    let savedTitle = "";
    let editorRequests = 0;
    global.fetch = jest.fn(async (input: unknown, init?: RequestInit) => {
      let response: unknown = { data: [] };
      if (init?.method === "PATCH") {
        savedTitle = patchListingSchema.parse(JSON.parse(String(init.body))).title ?? savedTitle;
        response = { data: { id: LISTING_ID } };
      } else if (String(input).includes("/editor")) {
        editorRequests += 1;
        response = {
          data: { ...editorResponse.data, status: "draft", title: savedTitle, city: "" },
        };
      }
      return { ok: true, status: 200, json: async () => response };
    }) as unknown as typeof fetch;
    // jsdom has no scrollIntoView, which a failed publish calls on the first invalid field.
    Element.prototype.scrollIntoView = jest.fn();

    render(<ListingForm listingId={LISTING_ID} />, { wrapper: Wrapper });
    const title = await screen.findByRole("textbox", { name: (name) => name.startsWith("Title") });
    const city = screen.getByRole("textbox", { name: (name) => name.startsWith("City") });
    await waitFor(() => expect(editorRequests).toBe(1));

    fireEvent.click(screen.getByRole("button", { name: "Publish Listing" }));
    await waitFor(() => expect(title).toBeInvalid());
    expect(city).toBeInvalid();

    fireEvent.change(title, { target: { value: "Fixed title" } });
    await waitFor(() => expect(title).toBeValid());
    await waitFor(() => expect(editorRequests).toBe(2), { timeout: 3000 });
    // Let the refetched listing reach the form before the next edit.
    await new Promise((resolve) => setTimeout(resolve, 50));

    fireEvent.change(city, { target: { value: "Waterloo" } });
    await waitFor(() => expect(city).toBeValid());
  });
});

describe("ListingForm live preview", () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (input: unknown) =>
      String(input).includes("/editor")
        ? { ok: true, status: 200, json: async () => editorResponse }
        : { ok: true, status: 200, json: async () => ({ data: [] }) },
    ) as unknown as typeof fetch;
    window.scrollTo = jest.fn() as unknown as typeof window.scrollTo;
  });

  // Below lg the layout divider is hidden, so this button is the only way back to the card.
  it("returns from the details preview to the card preview", async () => {
    render(<ListingForm listingId={LISTING_ID} />, { wrapper: Wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /^View listing:/ }));
    expect(screen.queryByRole("button", { name: /^View listing:/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Back to card preview" }));

    expect(screen.getByRole("button", { name: /^View listing:/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back to card preview" })).toBeNull();
  });
});

describe("ListingForm publishing", () => {
  it("sends no autosave after a successful publish", async () => {
    const requests: string[] = [];
    global.fetch = jest.fn(async (input: unknown, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method !== "GET") {
        requests.push(method);
      }
      const body = String(input).includes("/editor")
        ? { data: { ...editorResponse.data, status: "draft" } }
        : method === "GET"
          ? { data: [] }
          : { data: { id: LISTING_ID } };
      return { ok: true, status: 200, json: async () => body };
    }) as unknown as typeof fetch;

    render(<ListingForm listingId={LISTING_ID} />, { wrapper: Wrapper });
    const title = await screen.findByRole("textbox", { name: (name) => name.startsWith("Title") });
    await waitFor(() => expect(title).toHaveValue("123 Main St Apartments"));

    // Publish before the autosave for this edit has fired.
    fireEvent.change(title, { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish Listing" }));
    await waitFor(() => expect(requests).toEqual(["PUT"]), { timeout: 3000 });

    // The listing page has not replaced the form yet. Longer than the autosave delay.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(requests).toEqual(["PUT"]);
  });
});
