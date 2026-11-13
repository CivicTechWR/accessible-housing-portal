"use client";
import { Button } from "@/components/ui/button";
import { DatePicker, DatePickerProps } from "../date-picker/DatePicker";
import { PriceRangeInput, PriceRangeInputProps } from "../price-range-input/PriceRangeInput";
import { ToggleField, ToggleFieldProps } from "../toggle-field/ToggleField";
import { FeatureAccordion, DynamicFilterGroup } from "../feature-accordian/FeatureAccordian";
import { ComponentProps } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ListingFiltersProps {
  dynamicGroups: DynamicFilterGroup[];
  bedroomToggleProps: ToggleFieldProps;
  priceRangeProps: PriceRangeInputProps;
  bathroomToggleProps: ToggleFieldProps;
  getFeatureCheckboxProps: (id: string) => ComponentProps<typeof Checkbox>;
  datePickerProps: DatePickerProps;
  clearFilters: () => Promise<void>;
  className?: string;
}

// On phones, stretch the options into full-width segments that are big enough to tap.
const mobileToggleClassNames = {
  groupClassName: "max-sm:w-full",
  itemClassName: "max-sm:h-11 max-sm:flex-1 max-sm:text-sm",
};

export function ListingFilters({
  bedroomToggleProps,
  priceRangeProps,
  bathroomToggleProps,
  getFeatureCheckboxProps,
  datePickerProps,
  clearFilters,
  dynamicGroups,
  className,
}: ListingFiltersProps) {
  return (
    <div className={cn("w-full max-w-sm border p-4 space-y-6", className)}>
      <h2 className="text-lg">Filters</h2>

      <PriceRangeInput {...priceRangeProps} />

      <ToggleField {...bedroomToggleProps} allowEmpty {...mobileToggleClassNames} />
      <ToggleField {...bathroomToggleProps} allowEmpty {...mobileToggleClassNames} />

      <div className="space-y-4">
        <DatePicker {...datePickerProps} />
      </div>

      <FeatureAccordion groups={dynamicGroups} getCheckboxProps={getFeatureCheckboxProps} />

      <div className="flex items-center gap-4 pt-4 border-t">
        <Button variant="outline" className="flex-1" onClick={clearFilters}>
          Clear
        </Button>
      </div>
    </div>
  );
}
