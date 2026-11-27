"use client";

import type { ComponentProps, ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  LayoutTwoColumnIcon,
  ListViewIcon,
  MapsIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { PriceRangeInput, PriceRangeInputProps } from "../price-range-input/PriceRangeInput";
import { ToggleField, ToggleFieldProps } from "../toggle-field/ToggleField";

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
  /** The "Filters" button that opens every filter. */
  filterButton?: ReactNode;
}

function formatPrice(value: number) {
  return `$${value.toLocaleString()}`;
}

function priceSummary(min?: number, max?: number) {
  if (min !== undefined && max !== undefined) return `${formatPrice(min)}–${formatPrice(max)}`;
  if (min !== undefined) return `${formatPrice(min)}+`;
  if (max !== undefined) return `Up to ${formatPrice(max)}`;
  return undefined;
}

function roomSummary(value: string | null | undefined, noun: string) {
  if (!value) return undefined;
  return `${value} ${noun}${value === "1" ? "" : "s"}`;
}

/** A compact filter button that opens one filter in a popover, like "Price" or "Beds". */
function FilterPopover({
  label,
  value,
  children,
}: {
  label: string;
  /** What the filter is set to, shown in place of the label. */
  value?: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={value ? `${label}: ${value}` : undefined}
          className={cn(
            "gap-1.5 font-normal",
            value && "border-primary-text/60 bg-primary/5 font-medium dark:bg-primary/15",
          )}
        >
          {value ?? label}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="size-4 text-muted-foreground"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-64 p-4">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function ListingFilterSearchBar({
  searchInputProps,
  priceRangeProps,
  bedroomToggleProps,
  bathroomToggleProps,
  filterButton,
}: ListingFilterSearchBarProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-sm sm:min-w-40">
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          aria-label="Search by city, address, or building"
          {...searchInputProps}
          className="pl-9"
        />
      </div>

      {/* Phones and small tablets reach these through the Filters button. */}
      <div className="hidden items-center gap-2 md:flex">
        <FilterPopover label="Price" value={priceSummary(priceRangeProps.min, priceRangeProps.max)}>
          <PriceRangeInput {...priceRangeProps} className="w-72 gap-3" />
        </FilterPopover>
        <FilterPopover label="Beds" value={roomSummary(bedroomToggleProps.value, "bed")}>
          <ToggleField {...bedroomToggleProps} allowEmpty />
        </FilterPopover>
        <FilterPopover label="Baths" value={roomSummary(bathroomToggleProps.value, "bath")}>
          <ToggleField {...bathroomToggleProps} allowEmpty />
        </FilterPopover>
      </div>

      {filterButton}
    </div>
  );
}

const VIEW_ICONS = {
  [DisplayMode.MAP_LIST]: LayoutTwoColumnIcon,
  [DisplayMode.LIST]: ListViewIcon,
  [DisplayMode.MAP]: MapsIcon,
};

/**
 * Switches between split, list and map views. A single-select toggle group rather than tabs:
 * the views share one region and its controls, so there is no separate panel for tabs to own.
 */
export function ViewSwitch({
  displayModes,
  value,
  onChange,
}: {
  displayModes: { value: DisplayMode; label: string }[];
  value: DisplayMode;
  onChange: (value: DisplayMode) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label="View"
      spacing={1}
      value={value}
      onValueChange={(next) => {
        const mode = displayModes.find((option) => option.value === next);
        if (mode) onChange(mode.value);
      }}
      className="h-11 shrink-0 rounded-lg bg-muted p-1 md:h-10"
    >
      {displayModes.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="h-9 min-w-0 gap-1.5 rounded-md px-2.5 text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm md:h-8 dark:data-[state=on]:bg-input/40"
        >
          <HugeiconsIcon
            icon={VIEW_ICONS[option.value]}
            strokeWidth={2}
            className="size-4 max-sm:hidden"
            aria-hidden
          />
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
