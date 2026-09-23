import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";

import ListingForm from "./ListingForm";
import { patchListingSchema } from "@/shared/schemas/listings";

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
        selected = patch.accessibilityFeatures?.some((item) => item.id === feature.id) ?? selected;
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
});
