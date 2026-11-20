import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";

import { useListingFilters } from "./useListingFilter";

const useQueryStatesMock = jest.fn();

jest.mock("@/app/listings/searchParams", () => ({
  listingSearchParamsParsers: {},
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

  describe("search box", () => {
    function renderSearch(initialLocation?: string) {
      const setFilters = jest.fn(async (..._args: unknown[]) => new URLSearchParams());
      let filters = createFilters({ location: initialLocation });
      useQueryStatesMock.mockImplementation(() => [filters, setFilters]);
      const { result, rerender } = renderHook(() => useListingFilters());

      const type = (value: string) =>
        act(() => {
          result.current.searchInputProps.onChange({
            target: { value },
          } as React.ChangeEvent<HTMLInputElement>);
        });
      const submit = () => {
        const preventDefault = jest.fn();
        act(() => {
          result.current.searchFormProps.onSubmit({
            preventDefault,
          } as unknown as React.FormEvent<HTMLFormElement>);
        });
        return preventDefault;
      };
      // The URL's location changes: a submit landing, back/forward, or a link.
      const urlChangesTo = (location: string | undefined, other: Record<string, unknown> = {}) => {
        filters = createFilters({ location, ...other });
        rerender();
      };

      return { result, setFilters, type, submit, urlChangesTo };
    }

    it("leaves the URL alone while typing", () => {
      const { result, setFilters, type } = renderSearch();

      type("W");
      type("Wat");
      type("Waterloo");

      expect(result.current.searchInputProps.value).toBe("Waterloo");
      expect(setFilters).not.toHaveBeenCalled();
    });

    it("searches for the trimmed text on submit and adds a history entry", () => {
      const { result, setFilters, type, submit } = renderSearch();

      type("  Kitchener  ");
      const preventDefault = submit();

      expect(preventDefault).toHaveBeenCalled();
      expect(setFilters).toHaveBeenCalledWith({ location: "Kitchener" }, { history: "push" });
      expect(result.current.searchInputProps.value).toBe("Kitchener");
    });

    it.each(["", "   "])("clears the location on submitting %j", (value) => {
      const { result, setFilters, type, submit } = renderSearch("Waterloo, ON");

      type(value);
      submit();

      expect(setFilters).toHaveBeenCalledWith({ location: null }, { history: "push" });
      expect(result.current.searchInputProps.value).toBe("");
    });

    it("follows the URL when its location changes, as on back/forward or a link", () => {
      const { result, type, urlChangesTo } = renderSearch("Waterloo");

      type("Kitch");
      urlChangesTo("Guelph");
      expect(result.current.searchInputProps.value).toBe("Guelph");

      urlChangesTo(undefined);
      expect(result.current.searchInputProps.value).toBe("");
    });

    it("keeps unsubmitted text when another filter changes", () => {
      const { result, type, urlChangesTo } = renderSearch("Waterloo");

      type("Waterloo Region");
      urlChangesTo("Waterloo", { bedrooms: "2" });

      expect(result.current.searchInputProps.value).toBe("Waterloo Region");
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
