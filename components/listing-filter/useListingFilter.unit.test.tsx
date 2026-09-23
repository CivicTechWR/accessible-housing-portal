import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";

import { normalizeLocationFilter, useListingFilters } from "./useListingFilter";

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

  it("keeps typed text in the input while syncing the location query param", () => {
    const { result, setFilters } = renderFilters();

    act(() => {
      result.current.searchInputProps.onChange({
        target: { value: "Kitchener" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.searchInputProps.value).toBe("Kitchener");
    expect(setFilters).toHaveBeenCalledWith({ location: "Kitchener" });
  });

  it("clears the location query param instead of restoring a default city", () => {
    const { result, setFilters } = renderFilters({ location: "Waterloo, ON" });

    act(() => {
      result.current.searchInputProps.onChange({
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.searchInputProps.value).toBe("");
    expect(setFilters).toHaveBeenCalledWith({ location: null });
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
});

describe("normalizeLocationFilter", () => {
  it("trims meaningful values and clears whitespace-only input", () => {
    expect(normalizeLocationFilter("  Cambridge  ")).toBe("Cambridge");
    expect(normalizeLocationFilter("   ")).toBeNull();
  });
});
