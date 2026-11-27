"use client";
import { AccessibilityMark } from "@/components/ui/accessibility-mark";
import { Button } from "@/components/ui/button";
import { DatePicker, DatePickerProps } from "../date-picker/DatePicker";
import { PriceRangeInput, PriceRangeInputProps } from "../price-range-input/PriceRangeInput";
import { ToggleField, ToggleFieldProps } from "../toggle-field/ToggleField";
import { FeatureAccordion, DynamicFilterGroup } from "../feature-accordian/FeatureAccordian";
import { useEffect, useRef, type ComponentProps } from "react";
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
  /** False when the container renders its own pinned actions, as the mobile sheet does. */
  showActions?: boolean;
  /** Opens on this section, scrolled into view, with its groups expanded. */
  initialSection?: "accessibility";
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
  showActions = true,
  initialSection,
  className,
}: ListingFiltersProps) {
  const accessibilityRef = useRef<HTMLDivElement>(null);
  const opensOnAccessibility = initialSection === "accessibility";

  useEffect(() => {
    if (opensOnAccessibility) accessibilityRef.current?.scrollIntoView({ block: "start" });
  }, [opensOnAccessibility]);

  return (
    <div className={cn("w-full max-w-sm border p-4 space-y-6", className)}>
      <h2 className="text-xl font-bold">Filters</h2>

      <PriceRangeInput {...priceRangeProps} />

      <ToggleField {...bedroomToggleProps} allowEmpty {...mobileToggleClassNames} />
      <ToggleField {...bathroomToggleProps} allowEmpty {...mobileToggleClassNames} />

      <DatePicker {...datePickerProps} />

      {dynamicGroups.length > 0 && (
        <div ref={accessibilityRef} className="scroll-mt-4 space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <AccessibilityMark size="sm" />
            Accessibility features
          </h3>
          <FeatureAccordion
            groups={dynamicGroups}
            getCheckboxProps={getFeatureCheckboxProps}
            defaultOpen={opensOnAccessibility}
          />
        </div>
      )}

      {showActions && (
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
