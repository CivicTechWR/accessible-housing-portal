"use client";

import { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { FieldGroup } from "@/components/ui/field";
import { PriceRangeInput, PriceRangeInputProps } from "../price-range-input/PriceRangeInput";
import { ToggleField, ToggleFieldProps } from "../toggle-field/ToggleField";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
export enum DisplayMode {
  LIST = "list",
  MAP_LIST = "map_list",
  MAP = "map",
}
export interface ListingFilterSearchBarProps {
  searchInputProps: ComponentProps<typeof Input>;
  priceRangeProps: PriceRangeInputProps;
  bedroomToggleProps: ToggleFieldProps;
  bathroomToggleProps: ToggleFieldProps;
  displayModeProps: {
    displayModes: {
      value: DisplayMode;
      label: string;
    }[];
    onChange: (value: string) => void;
    value: DisplayMode;
  };
}

export function ListingFilterSearchBar({
  searchInputProps,
  priceRangeProps,
  bedroomToggleProps,
  bathroomToggleProps,
  displayModeProps,
}: ListingFilterSearchBarProps) {
  return (
    <FieldGroup className="w-full gap-3 space-y-0 sm:flex-row sm:items-end sm:gap-4 lg:gap-6">
      <div className="w-full sm:max-w-sm sm:flex-1">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input {...searchInputProps} className="h-10 pl-9" />
        </div>
      </div>

      <div className="w-full sm:max-w-[280px] sm:shrink-0">
        <PriceRangeInput
          {...priceRangeProps}
          fieldClassName="gap-1 sm:gap-1.5"
          labelClassName="sm:leading-tight"
        />
      </div>

      <div className="hidden lg:flex items-center gap-6 shrink-0">
        <ToggleField
          {...bedroomToggleProps}
          allowEmpty
          className="gap-1 sm:gap-1.5"
          titleWrapperClassName="mb-0.5 gap-1"
        />
        <ToggleField
          {...bathroomToggleProps}
          allowEmpty
          className="gap-1 sm:gap-1.5"
          titleWrapperClassName="mb-0.5 gap-1"
        />
      </div>

      <div className="w-full sm:w-auto sm:shrink-0">
        <div className="overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
          <ToggleField
            title={"View"}
            value={displayModeProps.value}
            onValueChange={displayModeProps.onChange}
            options={displayModeProps.displayModes}
            className="gap-1 sm:gap-1.5"
            titleWrapperClassName="mb-0.5 gap-1"
          />
        </div>
      </div>
    </FieldGroup>
  );
}
