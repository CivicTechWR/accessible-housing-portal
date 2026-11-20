import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";

import { useListingFilters } from "./useListingFilter";

const useQueryStatesMock = jest.fn();

jest.mock("@/app/listings/searchParams", () => ({
  listingSearchParamsParsers: {},
  loadListingSearchParams: (search: string) => ({
    location: new URLSearchParams(search).get("location"),
  }),
}));

jest.mock("nuqs", () => ({
  useQueryStates: (...args: unknown[]) => useQueryStatesMock(...args),
}));

function createFilters(overrides: Record<string, unknown> = {}) {
  return {
    bathrooms: undefined,
    bedrooms: undefined,
    features: [],
    location: undefined,
    maxPrice: undefined,
    minPrice: undefined,
    moveInDate: undefined,
    sort: "newest",
    ...overrides,
  };
}

function renderFilters(overrides: Record<string, unknown> = {}) {
  const setFilters = jest.fn(async (..._args: unknown[]) => new URLSearchParams());
  useQueryStatesMock.mockReturnValue([createFilters(overrides), setFilters]);
  const { result } = renderHook(() => useListingFilters());
  return { result, setFilters };
}

describe("useListingFilters", () => {
  beforeEach(() => {
    useQueryStatesMock.mockReset();
  });

  it("does not prefill the search input when no location filter is active", () => {
    const { result } = renderFilters();

    expect(result.current.searchInputProps.value).toBe("");
    expect(result.current.searchInputProps.placeholder).toBe("Search city, address, or building");
  });

  it("keeps typed text in the input while syncing the trimmed location query param", () => {
    const { result, setFilters } = renderFilters();

    act(() => {
      result.current.searchInputProps.onChange({
        target: { value: "  Kitchener  " },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.searchInputProps.value).toBe("  Kitchener  ");
    expect(setFilters).toHaveBeenCalledWith({ location: "Kitchener" });
  });

  it.each(["", "   "])(
    "clears the location query param for %j instead of restoring a default city",
    (value) => {
      const { result, setFilters } = renderFilters({ location: "Waterloo, ON" });

      act(() => {
        result.current.searchInputProps.onChange({
          target: { value },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.searchInputProps.value).toBe(value);
      expect(setFilters).toHaveBeenCalledWith({ location: null });
    },
  );

  describe("when the URL catches up to typing late", () => {
    function renderWithUrl(initialLocation?: string) {
      const setFilters = jest.fn(async (..._args: unknown[]) => new URLSearchParams());
      let filters = createFilters({ location: initialLocation });
      useQueryStatesMock.mockImplementation(() => [filters, setFilters]);
      const { result, rerender } = renderHook(
        ({ navigationKey }: { navigationKey: number }) => useListingFilters({ navigationKey }),
        { initialProps: { navigationKey: 1 } },
      );
      let navigationKey = 1;

      // Like a real keystroke, each change builds on whatever the input currently shows.
      const changeInput = (value: string) =>
        act(() => {
          result.current.searchInputProps.onChange({
            target: { value },
          } as React.ChangeEvent<HTMLInputElement>);
        });
      const typeKeys = (keys: string) => {
        for (const key of keys) changeInput(`${result.current.searchInputProps.value}${key}`);
      };
      const urlChangesTo = (location: string | undefined) => {
        filters = createFilters({ location });
        rerender({ navigationKey });
      };
      // A link or router push to `url`: the server renders the page again with a new key.
      const navigateTo = (url: string) => {
        act(() => {
          window.history.pushState(null, "", url);
        });
        navigationKey += 1;
        urlChangesTo(new URLSearchParams(url.split("?")[1]).get("location") ?? undefined);
      };
      // The URL update for the nth change sent to setFilters (1-based) lands.
      const urlCatchesUpTo = (n: number) => {
        const update = setFilters.mock.calls[n - 1]?.[0] as { location: string | null } | undefined;
        if (!update) throw new Error(`Only ${setFilters.mock.calls.length} updates were sent.`);
        urlChangesTo(update.location ?? undefined);
      };
      const sentCount = () => setFilters.mock.calls.length;

      return { result, setFilters, typeKeys, urlChangesTo, urlCatchesUpTo, sentCount, navigateTo };
    }

    it("keeps every typed character when an older keystroke's URL update arrives late", () => {
      const { result, setFilters, typeKeys, urlCatchesUpTo, sentCount } = renderWithUrl();

      typeKeys("Wate");
      urlCatchesUpTo(2);
      typeKeys("r");
      urlCatchesUpTo(3);
      typeKeys("loo");
      urlCatchesUpTo(4);
      urlCatchesUpTo(sentCount());

      expect(result.current.searchInputProps.value).toBe("Waterloo");
      expect(setFilters).toHaveBeenLastCalledWith({ location: "Waterloo" });
    });

    it("keeps the typed text when the same URL update arrives twice out of order", () => {
      const { result, typeKeys, urlCatchesUpTo } = renderWithUrl();

      typeKeys("Wa");
      urlCatchesUpTo(1);
      urlCatchesUpTo(2);
      typeKeys("t");
      // A second, older copy of the first keystroke's update.
      urlCatchesUpTo(1);
      typeKeys("erloo");

      expect(result.current.searchInputProps.value).toBe("Waterloo");
    });

    it("restores the URL's location on back/forward navigation", () => {
      const { result, typeKeys, urlChangesTo } = renderWithUrl();

      typeKeys("Kitchener");
      act(() => {
        window.history.pushState(null, "", "/listings?location=Cambridge");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
      urlChangesTo("Cambridge");

      expect(result.current.searchInputProps.value).toBe("Cambridge");

      act(() => {
        window.history.pushState(null, "", "/listings");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
      urlChangesTo(undefined);

      expect(result.current.searchInputProps.value).toBe("");
    });

    it("shows the new location after a link or router push while the page is open", () => {
      const { result, typeKeys, urlCatchesUpTo, sentCount, navigateTo } = renderWithUrl();

      typeKeys("Kitchener");
      urlCatchesUpTo(sentCount());
      navigateTo("/listings?location=Guelph");

      expect(result.current.searchInputProps.value).toBe("Guelph");

      navigateTo("/listings");

      expect(result.current.searchInputProps.value).toBe("");
    });

    it("keeps the typed text when the page re-renders without a navigation", () => {
      const { result, typeKeys, urlCatchesUpTo } = renderWithUrl();

      typeKeys("Waterloo");
      // An older update lands with the same navigation key, as it does while typing.
      urlCatchesUpTo(3);

      expect(result.current.searchInputProps.value).toBe("Waterloo");
    });
  });

  it("clears the minimum price filter with null instead of leaving stale query state behind", async () => {
    const { result, setFilters } = renderFilters({ minPrice: 1800 });

    await act(async () => {
      await result.current.priceRangeProps.onMinChange(undefined);
    });

    expect(setFilters).toHaveBeenCalledWith({ minPrice: null });
  });

  it("keeps min and max price consistent when the new minimum exceeds the current maximum", async () => {
    const { result, setFilters } = renderFilters({ maxPrice: 2000 });

    await act(async () => {
      await result.current.priceRangeProps.onMinChange(2400);
    });

    expect(setFilters).toHaveBeenCalledWith({ minPrice: 2400, maxPrice: 2400 });
  });

  it("counts each selected feature as a separate active filter", () => {
    const { result } = renderFilters({ features: ["wheelchair-ramp", "custom-field-uuid"] });

    expect(result.current.activeFilterCount).toBe(2);
  });

  it("adds feature selections to the count alongside other active filters", () => {
    const { result } = renderFilters({ bedrooms: "2", features: ["custom-field-uuid"] });

    expect(result.current.activeFilterCount).toBe(2);
  });

  it("does not count features when none are selected", () => {
    const { result } = renderFilters({ features: [] });

    expect(result.current.activeFilterCount).toBe(0);
  });
});
