"use client";

import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
  /** The search runs when this form is submitted, by Enter or the Search button. */
  searchFormProps: ComponentProps<"form">;
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
  /** Shown beside the search box below `sm`, so phones reach the filters in every view. */
  mobileFilterButton?: ReactNode;
}

export function ListingFilterSearchBar({
  searchInputProps,
  searchFormProps,
  priceRangeProps,
  bedroomToggleProps,
  bathroomToggleProps,
  displayModeProps,
  mobileFilterButton,
}: ListingFilterSearchBarProps) {
  return (
    <FieldGroup className="w-full gap-3 space-y-0 sm:flex-row sm:items-end sm:gap-4 lg:gap-6">
      <div className="flex w-full items-center gap-2 sm:max-w-sm sm:flex-1">
        <form {...searchFormProps} className="min-w-0 flex-1">
          <InputGroup className="h-10">
            <InputGroupAddon aria-hidden>
              <HugeiconsIcon icon={Search01Icon} className="size-4" />
            </InputGroupAddon>
            <InputGroupInput {...searchInputProps} />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="submit" variant="default" size="sm" className="h-8 px-3">
                Search
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
        {mobileFilterButton}
      </div>

      {/* On phones, price lives in the filter sheet with the other filters. */}
      <div className="hidden sm:block sm:max-w-[280px] sm:shrink-0">
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
