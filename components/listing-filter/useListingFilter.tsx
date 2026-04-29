import { listingSearchParamsParsers } from "@/app/listings/searchParams";
import { isListingSortOption } from "@/app/listings/query";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { FilterButtonProps } from "@/components/filter-button/FilterButton";

const LISTING_LOCATION_PLACEHOLDER = "Search city, address, or building";

export function normalizeLocationFilter(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function useListingFilters() {
  const [filters, setFilters] = useQueryStates(listingSearchParamsParsers);
  const [locationInputValue, setLocationInputValue] = useState(filters.location ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocationInputValue(filters.location ?? "");
  }, [filters.location]);

  // --- 1. Static Props (Variables) ---
  const sortOptionProps = useMemo(
    () => ({
      sortOptions: [
        { value: "newest", label: "Newest" },
        { value: "oldest", label: "Oldest" },
        { value: "price_asc", label: "Price: Low to High" },
        { value: "price_desc", label: "Price: High to Low" },
      ],
      onChange: async (value: string) => {
        if (isListingSortOption(value)) {
          await setFilters({ sort: value });
        }
      },
    }),
    [filters.sort, setFilters],
  );

  const searchInputProps = useMemo(
    () => ({
      autoComplete: "off" as const,
      placeholder: LISTING_LOCATION_PLACEHOLDER,
      type: "search" as const,
      value: locationInputValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextLocation = e.target.value;

        setLocationInputValue(nextLocation);

        startTransition(() => {
          void setFilters({ location: normalizeLocationFilter(nextLocation) });
        });
      },
    }),
    [locationInputValue, setFilters, startTransition],
  );

  const priceRangeProps = useMemo(
    () => ({
      min: filters.minPrice ?? undefined,
      max: filters.maxPrice ?? undefined,
      step: 100,
      onMinChange: async (min: number | undefined) => {
        if (min !== undefined && filters.maxPrice !== null && min > filters.maxPrice) {
          await setFilters({ minPrice: min, maxPrice: min });
          return;
        }
        await setFilters({ minPrice: min ?? null });
      },
      onMaxChange: async (max: number | undefined) => {
        if (max !== undefined && filters.minPrice !== null && max < filters.minPrice) {
          await setFilters({ maxPrice: max, minPrice: max });
          return;
        }
        await setFilters({ maxPrice: max ?? null });
      },
    }),
    [filters.minPrice, filters.maxPrice, setFilters],
  );

  const bedroomToggleProps = useMemo(
    () => ({
      title: "Bedrooms",
      value: filters.bedrooms?.toString() || undefined,
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4+", label: "4+" },
      ],
      onValueChange: async (val: string) => {
        await setFilters({
          bedrooms: val === "" ? null : val,
        });
      },
    }),
    [filters.bedrooms, setFilters],
  );

  const bathroomToggleProps = useMemo(
    () => ({
      title: "Bathrooms",
      value: filters.bathrooms?.toString() || undefined,
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4+", label: "4+" },
      ],
      onValueChange: async (val: string) => {
        await setFilters({
          bathrooms: val === "" ? null : val,
        });
      },
    }),
    [filters.bathrooms, setFilters],
  );

  const datePickerProps = useMemo(
    () => ({
      selected: filters.moveInDate || undefined,
      onSelect: async (d?: Date) => await setFilters({ moveInDate: d ?? null }),
      formattedText: filters.moveInDate
        ? filters.moveInDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "",
    }),
    [filters.moveInDate, setFilters],
  );

  // --- 2. Dynamic Getters (Functions) ---

  const getFeatureCheckboxProps = useCallback(
    (id: string) => {
      const currentFeatures = filters.features || [];
      const isChecked = currentFeatures.includes(id);

      return {
        id: `feature-${id}`,
        checked: isChecked,
        onCheckedChange: async (checked: boolean) => {
          if (checked) {
            await setFilters({ features: [...currentFeatures, id] });
          } else {
            const nextFeatures = currentFeatures.filter((f) => f !== id);
            await setFilters({
              features: nextFeatures.length > 0 ? nextFeatures : null,
            });
          }
        },
      };
    },
    [filters.features, setFilters],
  );

  // --- 3. Derived State ---

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.bedrooms) count++;
    if (filters.bathrooms) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.moveInDate) count++;
    if (filters.features && filters.features.length > 0) count++;
    return count;
  }, [
    filters.bedrooms,
    filters.bathrooms,
    filters.minPrice,
    filters.maxPrice,
    filters.moveInDate,
    filters.features,
  ]);

  // --- 4. Getters ---

  const getFilterButtonProps = useCallback(
    (isFilterOpen: boolean, onFilterClick: () => void): FilterButtonProps => ({
      activeFilterCount,
      isFilterOpen,
      onFilterClick,
    }),
    [activeFilterCount],
  );

  // --- 5. Actions ---

  const clearFilters = useCallback(async () => {
    await setFilters({
      minPrice: null,
      maxPrice: null,
      bedrooms: null,
      bathrooms: null,
      moveInDate: null,
      features: null,
    });
  }, [setFilters]);

  return {
    ...filters,
    activeFilterCount,
    sortOptionProps,
    searchInputProps,
    priceRangeProps,
    bedroomToggleProps,
    bathroomToggleProps,
    datePickerProps,
    getFeatureCheckboxProps,
    getFilterButtonProps,
    clearFilters,
  };
}
