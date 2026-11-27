"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  WheelchairIcon,
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
import type { DynamicFilterGroup } from "../feature-accordian/FeatureAccordian";
import { LabelledCheckbox } from "../labelled-checkbox/LabelledCheckbox";
import { Checkbox } from "@/components/ui/checkbox";
import { toSentenceCase } from "@/lib/listing-format";

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
  /** The accessibility feature filters, for the desktop Accessibility popover. */
  accessibilityFilter?: AccessibilityFilterProps;
}

interface AccessibilityFilterProps {
  groups: DynamicFilterGroup[];
  getCheckboxProps: (id: string) => ComponentProps<typeof Checkbox>;
  /** How many accessibility features are selected. */
  count: number;
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

/** A filter in use is filled with the brand tint, so applied filters stand out from the rest. */
export const activeFilterClassName =
  "border-transparent bg-primary/10 font-medium text-primary-text hover:bg-primary/15 hover:text-primary-text aria-expanded:bg-primary/15 aria-expanded:text-primary-text dark:border-transparent dark:bg-primary-text/15 dark:hover:bg-primary-text/20";

/** The phone quick-filter chips: fully rounded, so the row reads as chips, and 44px to tap. */
const chipClassName = "h-11 shrink-0 rounded-full px-4";

/** The number of selected options, on a filter button. */
function CountBadge({ count }: { count: number }) {
  return (
    <span
      aria-hidden
      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
    >
      {count}
    </span>
  );
}

function accessibilityLabel(count: number) {
  return count > 0 ? `Accessibility, ${count} selected` : "Accessibility";
}

/** A compact filter button that opens one filter in a popover, like "Price" or "Beds". */
function FilterPopover({
  label,
  value,
  chip = false,
  children,
}: {
  label: string;
  /** What the filter is set to, shown in place of the label. */
  value?: string;
  chip?: boolean;
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
            chip && chipClassName,
            value && activeFilterClassName,
          )}
        >
          {value ?? label}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn("size-4", !value && "text-muted-foreground")}
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-auto min-w-64 p-4">
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
  accessibilityFilter,
}: ListingFilterSearchBarProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-75 sm:min-w-40">
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

      {/* Phones get these as a row of chips under the search field instead. */}
      <div className="hidden items-center gap-2 sm:flex">
        <FilterPopover label="Price" value={priceSummary(priceRangeProps.min, priceRangeProps.max)}>
          <PriceRangeInput {...priceRangeProps} className="w-72 gap-3" />
        </FilterPopover>
        <FilterPopover label="Beds" value={roomSummary(bedroomToggleProps.value, "bed")}>
          <ToggleField {...bedroomToggleProps} allowEmpty />
        </FilterPopover>
        <FilterPopover label="Baths" value={roomSummary(bathroomToggleProps.value, "bath")}>
          <ToggleField {...bathroomToggleProps} allowEmpty />
        </FilterPopover>
        {/* Below `lg` there's no room for it, and the features stay in the Filters panel. */}
        {accessibilityFilter && accessibilityFilter.groups.length > 0 && (
          <AccessibilityPopover {...accessibilityFilter} />
        )}
      </div>

      {filterButton}
    </div>
  );
}

/** Every accessibility feature filter, grouped by category, in one scrolling popover. */
function AccessibilityPopover({ groups, getCheckboxProps, count }: AccessibilityFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={accessibilityLabel(count)}
          className={cn("gap-1.5 font-normal max-lg:hidden", count > 0 && activeFilterClassName)}
        >
          <HugeiconsIcon icon={WheelchairIcon} strokeWidth={2} className="size-4" aria-hidden />
          Accessibility
          {count > 0 ? (
            <CountBadge count={count} />
          ) : (
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
              aria-hidden
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="max-h-[min(32rem,var(--radix-popover-content-available-height))] w-80 overflow-y-auto p-0"
      >
        <div className="space-y-5 p-4">
          {groups.map((group) => (
            <fieldset key={group.groupId} className="space-y-3">
              <legend className="mb-3 text-sm font-semibold">
                {toSentenceCase(group.groupLabel)}
              </legend>
              {group.options.map((option) => {
                const checkboxProps = getCheckboxProps(option.id);
                return (
                  <LabelledCheckbox
                    key={option.id}
                    label={toSentenceCase(option.label)}
                    {...checkboxProps}
                    // The Filters panel can be open at the same time with the same checkboxes.
                    id={`popover-${checkboxProps.id}`}
                  />
                );
              })}
            </fieldset>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** How wide the fade is on an edge of the chip row that has more chips past it. */
const FADE_WIDTH = "24px";

/**
 * Fades whichever ends of a sideways-scrolling row have more content past them, so a clipped chip
 * reads as "scroll for more" rather than as a cut-off word.
 */
function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const update = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const start = node.scrollLeft > 1;
    const end = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [update]);
  const maskImage =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? `transparent, black ${FADE_WIDTH}` : "black"}, ${
          edges.end ? `black calc(100% - ${FADE_WIDTH}), transparent` : "black"
        })`
      : undefined;
  return { ref, onScroll: update, style: { maskImage } };
}

/**
 * The phone filter row under the search field: one chip per common filter, scrolling sideways.
 * Price, Beds and Baths open their own popover; Accessibility opens the filter sheet at the
 * accessibility features, because they are too many for a popover.
 */
export function QuickFilterChips({
  priceRangeProps,
  bedroomToggleProps,
  bathroomToggleProps,
  accessibilityCount,
  onAccessibilityClick,
  accessibilityRef,
  className,
}: Omit<
  ListingFilterSearchBarProps,
  "searchInputProps" | "filterButton" | "accessibilityFilter"
> & {
  /** How many accessibility features are selected. */
  accessibilityCount: number;
  onAccessibilityClick: () => void;
  /** Lets the filter sheet return focus to this chip when it closes. */
  accessibilityRef?: Ref<HTMLButtonElement>;
  className?: string;
}) {
  const fade = useScrollFade<HTMLDivElement>();
  return (
    <div
      {...fade}
      role="group"
      aria-label="Quick filters"
      className={cn(
        "flex gap-2 overflow-x-auto overflow-y-hidden px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <FilterPopover
        chip
        label="Price"
        value={priceSummary(priceRangeProps.min, priceRangeProps.max)}
      >
        <PriceRangeInput {...priceRangeProps} className="w-72 max-w-full gap-3" />
      </FilterPopover>
      <FilterPopover chip label="Beds" value={roomSummary(bedroomToggleProps.value, "bed")}>
        <ToggleField {...bedroomToggleProps} allowEmpty />
      </FilterPopover>
      <FilterPopover chip label="Baths" value={roomSummary(bathroomToggleProps.value, "bath")}>
        <ToggleField {...bathroomToggleProps} allowEmpty />
      </FilterPopover>
      <Button
        ref={accessibilityRef}
        variant="outline"
        onClick={onAccessibilityClick}
        aria-label={accessibilityLabel(accessibilityCount)}
        className={cn(
          "gap-1.5 font-normal",
          chipClassName,
          accessibilityCount > 0 && activeFilterClassName,
        )}
      >
        <HugeiconsIcon icon={WheelchairIcon} strokeWidth={2} className="size-4" aria-hidden />
        Accessibility
        {accessibilityCount > 0 && <CountBadge count={accessibilityCount} />}
      </Button>
    </div>
  );
}

/**
 * The phone List / Map switch: one pill floating at the bottom centre that names the other view,
 * so the whole screen goes to listings or the map.
 */
export function FloatingViewToggle({
  value,
  onChange,
  className,
}: {
  value: DisplayMode;
  onChange: (value: DisplayMode) => void;
  className?: string;
}) {
  const showsMap = value === DisplayMode.MAP;
  return (
    <Button
      onClick={() => onChange(showsMap ? DisplayMode.LIST : DisplayMode.MAP)}
      aria-label={showsMap ? "Show list" : "Show map"}
      className={cn(
        "h-11 gap-2 rounded-full bg-[#1f262c] px-5 text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:bg-[#1f262c]/90 dark:bg-white dark:text-[#1f262c] dark:hover:bg-white/90",
        className,
      )}
    >
      <HugeiconsIcon
        icon={showsMap ? ListViewIcon : MapsIcon}
        strokeWidth={2}
        className="size-4"
        aria-hidden
      />
      {showsMap ? "List" : "Map"}
    </Button>
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
